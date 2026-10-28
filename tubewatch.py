import os
import sys
import hashlib
import time
import json
import subprocess
import shutil
try:
	from PIL import Image
	PIL_AVAILABLE = True
except ImportError:
	PIL_AVAILABLE = False
	print("Warning: Pillow not available. PNG compression will only work if pngquant is installed.")

# Path to the directory with SWF files
DIRECTORY_TO_WATCH = 'fla'
HASH_FILE = 'fla/hashes.json'  # File to store hashes
SETTINGS_FILE = 'fla/settings.json'  # File to store hashes
ADL_PATH = '~/AIR/AIRSDK_51.1.1/bin/adl'
ASSET_PATH = 'src/tube/'

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = SCRIPT_DIR

def _expand_path(p):
	"""
	Expand ~ and environment variables for cross-platform config paths.
	"""
	if p is None:
		return None
	p = os.path.expandvars(os.path.expanduser(str(p)))
	return os.path.normpath(p)

def _resolve_project_path(p):
	"""
	Resolve config paths relative to the repo (tubewatch.py) directory.

	This makes tubewatch work regardless of current working directory,
	which differs between macOS and Windows terminals.
	"""
	if p is None:
		return None
	p = _expand_path(p)
	if os.path.isabs(p):
		return os.path.normpath(p)
	return os.path.normpath(os.path.join(PROJECT_ROOT, p))

def _resolve_adl_path(config):
	"""
	Resolve ADL executable path from config with OS-specific keys.

	Supported config keys:
	- ADL_PATH_MAC / ADL_PATH_DARWIN
	- ADL_PATH_WINDOWS / ADL_PATH_WIN
	- ADL_PATH (fallback)
	- ADL_PATHS (map) e.g. { "darwin": "...", "win32": "..." }
	"""
	is_win = sys.platform.startswith("win")
	candidates = []

	if isinstance(config, dict):
		if is_win:
			candidates.extend([config.get("ADL_PATH_WINDOWS"), config.get("ADL_PATH_WIN")])
		else:
			candidates.extend([config.get("ADL_PATH_MAC"), config.get("ADL_PATH_DARWIN")])

		candidates.append(config.get("ADL_PATH"))

		adl_paths = config.get("ADL_PATHS")
		if isinstance(adl_paths, dict):
			candidates.append(adl_paths.get(sys.platform))
			candidates.append(adl_paths.get("darwin") or adl_paths.get("mac"))
			candidates.append(adl_paths.get("win32") or adl_paths.get("windows"))

	# Final fallback to the module default.
	candidates.append(ADL_PATH)

	first_nonempty = None
	for c in candidates:
		if c is None:
			continue
		expanded = _expand_path(c)
		if first_nonempty is None:
			first_nonempty = expanded
		if expanded and os.path.exists(expanded):
			return expanded

	# Keep configured path even if not found; subprocess will fail clearly.
	if first_nonempty:
		print(f"Warning: ADL_PATH does not exist on disk: {first_nonempty}")
		return first_nonempty

	# Last resort: try PATH lookup.
	which_name = "adl.exe" if is_win else "adl"
	tool = shutil.which(which_name) or shutil.which("adl")
	if tool:
		return tool

	return _expand_path(ADL_PATH)

def _clear_dir_contents(dir_path):
	"""
	Clear all files/folders in `dir_path` (cross-platform).
	"""
	if not os.path.exists(dir_path):
		os.makedirs(dir_path, exist_ok=True)
	for name in os.listdir(dir_path):
		p = os.path.join(dir_path, name)
		try:
			if os.path.isfile(p) or os.path.islink(p):
				os.remove(p)
			elif os.path.isdir(p):
				shutil.rmtree(p)
		except Exception as e:
			print(f"Warning: failed to clear {p}: {e}")


def load_or_create_config():
	global ASSET_PATH
	global ADL_PATH
	global DIRECTORY_TO_WATCH
	global HASH_FILE
	global SETTINGS_FILE
	
	print ("Loading config file...")
	config_filename = os.path.join(PROJECT_ROOT, 'tubewatch-config.json')
	
	# Default values
	default_config = {
		"ASSET_PATH": ASSET_PATH,
		"ADL_PATH": ADL_PATH,
		"DIRECTORY_TO_WATCH": DIRECTORY_TO_WATCH
	}
	
	# Check if the config file exists
	if os.path.exists(config_filename):
		# Load and read the file
		with open(config_filename, 'r') as file:
			config = json.load(file)
			ASSET_PATH = _resolve_project_path(config.get("ASSET_PATH"))
			ADL_PATH = _resolve_adl_path(config)
			DIRECTORY_TO_WATCH = _resolve_project_path(config.get("DIRECTORY_TO_WATCH"))
			HASH_FILE = os.path.join(DIRECTORY_TO_WATCH, 'hashes.json')
			SETTINGS_FILE = os.path.join(DIRECTORY_TO_WATCH, 'settings.json')
			
			print(f"ASSET_PATH: {ASSET_PATH}")
			print(f"ADL_PATH: {ADL_PATH}")
			print(f"DIRECTORY_TO_WATCH: {DIRECTORY_TO_WATCH}")
			return config
	else:
		print ("Config file not found. Creating a new one...")
		# Create the file with default values
		with open(config_filename, 'w') as file:
			json.dump(default_config, file, indent=4)
		print(f"Config file '{config_filename}' created with default values.")
		ASSET_PATH = _resolve_project_path(default_config.get("ASSET_PATH"))
		DIRECTORY_TO_WATCH = _resolve_project_path(default_config.get("DIRECTORY_TO_WATCH"))
		HASH_FILE = os.path.join(DIRECTORY_TO_WATCH, 'hashes.json')
		SETTINGS_FILE = os.path.join(DIRECTORY_TO_WATCH, 'settings.json')
		ADL_PATH = _resolve_adl_path(default_config)
		return default_config


# Function to calculate the hash of a file
def calculate_hash(file_path):
	hash_obj = hashlib.sha256()
	with open(file_path, 'rb') as f:
		while chunk := f.read(8192):
			hash_obj.update(chunk)
	return hash_obj.hexdigest()

# Function to compress PNG using pngquant (preferred) or Pillow (fallback)
def compress_png(png_path, colors=256, dither=True):
	"""
	Compress PNG file using color quantization.
	Uses pngquant if available, otherwise falls back to Pillow.
	
	Args:
		png_path: Path to the PNG file to compress
		colors: Number of colors to reduce to (default: 256)
		dither: Whether to use dithering (default: True)
	
	Returns:
		True if compression succeeded, False otherwise
	"""
	if not os.path.exists(png_path):
		print(f"Warning: PNG file not found: {png_path}")
		return False
	
	original_size = os.path.getsize(png_path)
	
	# Try pngquant first (most effective, similar to compresspng.com)
	pngquant_path = shutil.which('pngquant')
	if pngquant_path:
		try:
			# pngquant creates a new file with -fs8 suffix, then we replace the original
			temp_path = png_path + '.tmp'
			cmd = [pngquant_path, '--force', '--quality', '65-80', '--colors', str(colors)]
			# Add --nofs flag to disable dithering if requested
			if not dither:
				cmd.append('--nofs')
			cmd.extend(['--output', temp_path, png_path])
			
			result = subprocess.run(
				cmd,
				capture_output=True,
				text=True
			)
			if result.returncode == 0 and os.path.exists(temp_path):
				os.replace(temp_path, png_path)
				new_size = os.path.getsize(png_path)
				reduction = ((original_size - new_size) / original_size) * 100
				dither_str = "with dithering" if dither else "without dithering"
				print(f"✓ PNG compressed with pngquant ({dither_str}): {original_size:,} → {new_size:,} bytes ({reduction:.1f}% reduction)")
				return True
			else:
				print(f"Warning: pngquant failed: {result.stderr}")
		except Exception as e:
			print(f"Warning: pngquant error: {e}")
	
	# Fallback to Pillow if pngquant is not available
	if PIL_AVAILABLE:
		try:
			img = Image.open(png_path)
			
			# Convert to RGBA if needed to preserve transparency
			if img.mode != 'RGBA':
				img = img.convert('RGBA')
			
			# Quantize the image (reduce colors)
			# Use dither parameter: 1 for dithering, 0 for no dithering
			# Note: dither parameter support varies by Pillow version
			dither_value = 1 if dither else 0
			try:
				quantized = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=dither_value)
			except TypeError:
				# Fallback for Pillow versions that don't support dither parameter
				quantized = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
			
			# Convert back to RGBA to preserve transparency
			quantized_rgba = quantized.convert('RGBA')
			
			# Save the compressed image
			quantized_rgba.save(png_path, 'PNG', optimize=True)
			
			new_size = os.path.getsize(png_path)
			reduction = ((original_size - new_size) / original_size) * 100
			dither_str = "with dithering" if dither else "without dithering"
			print(f"✓ PNG compressed with Pillow ({dither_str}): {original_size:,} → {new_size:,} bytes ({reduction:.1f}% reduction)")
			return True
		except Exception as e:
			print(f"Warning: Pillow compression error: {e}")
			return False
	else:
		print(f"Warning: Neither pngquant nor Pillow available. PNG compression skipped for {png_path}")
		return False
	
# Function to handle when a file change is detected
def on_file_change(file_path, scale = 1):
	print(f"File changed: {file_path}")
	# remove all old files in sprites folder
	#

	# make temp folder if it does not exist + clear it (cross-platform)
	fla_dir = DIRECTORY_TO_WATCH or os.path.join(PROJECT_ROOT, 'fla')
	temp_dir = os.path.join(fla_dir, 'temp')
	_clear_dir_contents(temp_dir)

	# base file name without extension and file path
	base_name = os.path.basename(file_path).split('.')[0]
	print(base_name)

	adl_args = [
		ADL_PATH,
		os.path.join(fla_dir, 'AirApp', 'FlashTube-app.xml'),
		os.path.join(fla_dir, 'AirApp'),
		'--',
		file_path,
		os.path.join(ASSET_PATH, f"{base_name}.xml"),
		base_name,
		temp_dir,
		str(scale),
	]
	print("Running ADL:", " ".join(map(str, adl_args)))
	subprocess.run(adl_args, check=False, cwd=PROJECT_ROOT)

	# and now the texturepacker
	texturepacker = _resolve_texturepacker()
	if not texturepacker:
		print("Warning: TexturePacker not found on PATH (tried TexturePacker / texturepacker). Skipping atlas step.")
		return

	texturepacker_args = [
		texturepacker,
		'--data', os.path.join(ASSET_PATH, f"{base_name}.json"),
		'--format', 'json',
		'--max-size', '4096',
		'--sheet', os.path.join(ASSET_PATH, f"{base_name}.png"),
		'--reduce-border-artifacts', temp_dir,
		'--size-constraints', 'POT',
		'--force-publish',
	]
	print("Running texturepacker:", " ".join(map(str, texturepacker_args)))
	subprocess.run(texturepacker_args, check=False, cwd=PROJECT_ROOT)
	
	# Compress the PNG sprite sheet (if enabled)
	png_path = os.path.join(ASSET_PATH, f"{base_name}.png")
	if os.path.exists(png_path):
		settings = load_settings()
		filename = os.path.basename(file_path)  # Full filename with .swf extension
		
		# Check if compression is enabled (default: True)
		compress_enabled = True
		if filename in settings and 'compress_png' in settings[filename]:
			compress_enabled = settings[filename]['compress_png']
		if filename in settings and 'compress_xml' in settings[filename]:
			compress_xml_enabled = settings[filename]['compress_xml']
		else:
			compress_xml_enabled = False

		if compress_enabled:
			# Get color count from settings if specified, otherwise use default 256
			colors = 256  # Default: 256 colors (recommended by compresspng.com)
			if filename in settings and 'png_colors' in settings[filename]:
				colors = settings[filename]['png_colors']
			
			# Get dithering setting (default: True)
			dither = True
			if filename in settings and 'png_dither' in settings[filename]:
				dither = settings[filename]['png_dither']
			
			print(f"Compressing PNG: {png_path} (target colors: {colors}, dithering: {dither})")
			compress_png(png_path, colors, dither)
		else:
			print(f"PNG compression disabled for {filename}, skipping compression")

		if compress_xml_enabled:
			xml_path = os.path.join(ASSET_PATH, f"{base_name}.xml")
			compress_xml(xml_path, xml_path)

		print(" -------------- done ---------------")
	else:
		print(f"Warning: PNG file not created: {png_path}")
	

def _resolve_texturepacker():
	"""
	Find TexturePacker on PATH. macOS CLI is `texturepacker`; Windows is `TexturePacker.exe`.
	"""
	for name in ("TexturePacker", "texturepacker", "TexturePacker.exe"):
		tool = shutil.which(name)
		if tool:
			return tool
	if sys.platform.startswith("win"):
		for candidate in (
			r"C:\Program Files\CodeAndWeb\TexturePacker\bin\TexturePacker.exe",
			r"C:\Program Files (x86)\CodeAndWeb\TexturePacker\bin\TexturePacker.exe",
		):
			if os.path.exists(candidate):
				return candidate
	return None


def compress_xml(xml_path, output_path):
	oldSize = os.path.getsize(xml_path)
	script = os.path.join(PROJECT_ROOT, 'scripts', 'compressxml.py')
	cmd = [sys.executable, script, xml_path, output_path]
	print(" ".join(cmd))
	subprocess.run(cmd, check=False, cwd=PROJECT_ROOT)
	newSize = os.path.getsize(output_path)
	reduction = ((oldSize - newSize) / oldSize) * 100
	print(f"XML compressed: {oldSize:,} → {newSize:,} bytes ({reduction:.1f}% reduction)")



# Load previously stored hashes
def load_hashes():
	if os.path.exists(HASH_FILE):
		with open(HASH_FILE, 'r') as f:
			return json.load(f)
	return {}

def load_settings():
	if os.path.exists(SETTINGS_FILE):
		try:
			with open(SETTINGS_FILE, 'r') as f:
				return json.load(f)
		except:
			print("Error loading settings.json. MALFORMED JSON")
			return {"error": "MALFORMED JSON"}
		
	return {}

# Save the updated hashes to the config file
def save_hashes(hashes):
	with open(HASH_FILE, 'w') as f:
		json.dump(hashes, f, indent=4)

def save_settings(settings):
	print(f"Saving settings: {settings}")
	with open(SETTINGS_FILE, 'w') as f:
		json.dump(settings, f, indent=4)	

FILE_STABLE_TIME = 1  # Time to wait before checking if the file is stable
def is_file_stable(file_path):
	size1 = os.path.getsize(file_path)
	time.sleep(FILE_STABLE_TIME)  # Wait to see if the file size changes
	size2 = os.path.getsize(file_path)
	return size1 == size2  # File is stable if its size remains the same


# Main function to monitor files
def monitor_directory():
	# Always run relative to the repo, even if launched from another cwd.
	os.chdir(PROJECT_ROOT)
	load_or_create_config()
	hashes = load_hashes()  # Load previous hashes
	settings = load_settings()
	print(f"Monitoring directory: {DIRECTORY_TO_WATCH}")
	while True:
		thereWereChanges = False
		for filename in os.listdir(DIRECTORY_TO_WATCH):
			if filename.endswith(".swf"):
				file_path = os.path.join(DIRECTORY_TO_WATCH, filename)
				# Get the file's last modification time
				last_modified = os.path.getmtime(file_path)
				newSettings = load_settings()
				scale = 1
				allowsavesettings = True
				if "error" in newSettings  :
					print("Error loading settings.json. MALFORMED JSON")
					allowsavesettings = False
				else:
					settings = newSettings
				
				if (filename in settings):
					scale =	settings[filename]["scale"]
					#print(f"loaded scale: {scale}")
				elif allowsavesettings:
					settings[filename] = {'scale': 1}
					save_settings(settings)

				#print(f"File: {filename}")
				#print(f"Scale: {scale}")
				# Check if the file is in the hash list and if it was modified
				if filename not in hashes or hashes[filename]['last_modified'] != last_modified or ("last_scale" in hashes[filename] and hashes[filename]['last_scale'] != scale):
					# File has been modified or is new, calculate its new hash
					print(f"Checking file hash: {file_path}")

					new_hash = calculate_hash(file_path)
					oldscale = 1
					if (  filename in hashes and "last_scale" in hashes[filename] ):
						oldscale = hashes[filename]['last_scale']

					if is_file_stable(file_path):
						if (scale != oldscale):
							print(f"File {filename} new scale {scale}")
							on_file_change(file_path, scale)  # Call your function
							# Update the stored hash and modification time
							hashes[filename] = {
								'hash': new_hash,
								'last_modified': last_modified,
								'last_scale': scale
							}
							thereWereChanges = True
						# Check if the hash has changed
						elif filename not in hashes or hashes[filename]['hash'] != new_hash  :
							on_file_change(file_path, scale)  # Call your function
							# Update the stored hash and modification time
							hashes[filename] = {
								'hash': new_hash,
								'last_modified': last_modified,
								'last_scale': scale
							}
							thereWereChanges = True
						else:
							print(f"File {filename} unchanged")
							hashes[filename] = {
								'hash': new_hash,
								'last_modified': last_modified,
								'last_scale': scale
							}
							save_hashes(hashes)

		# Save the updated hashes after checking all files
		if thereWereChanges:
			save_hashes(hashes)
		# Sleep for a while before the next check (e.g., 60 seconds)
		time.sleep(1)

if __name__ == "__main__":
	monitor_directory()
