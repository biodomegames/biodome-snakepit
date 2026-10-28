# FlashTube

FlashTube is the animation runtime this project plays. Clips are authored in Adobe Animate, exported to `src/tube/`, and drawn with Pixi. The starter dialog’s sound and music toggles are the `checkbox` clip in the `main` tube.

## Files

A tube is three files that share a name:

- `src/tube/main.xml` — sequences, frames, labels, and sprite placement
- `src/tube/main.json` — texture atlas (Pixi)
- `src/tube/main.png` — the atlas image

Register the tube in `src/js/data_tubelist.js`:

```js
export const TubesList = {
  main: {
    xml: "tube/main.xml",
    json: "tube/main.json",
  },
}
```

`DialogDefinitions.TubeDefinitions` is that same object. The preloader sees `{ xml, json }`, builds a `FlashTube`, and stores it on `.tube`. Dialog code looks the tube up by the key (`"main"`), so the object you preload must be the one in `TubeDefinitions`.

`FlashTube.init()` parses the XML into `tube.data[sequenceName]`. The tube is also stored on `window.alltubes` under the XML filename (without `.xml`, and cut at the first `-`).

## Playing a clip from a dialog

Add an item whose component type is `movieclip` (`ComponentTypes.MOVIECLIP`):

```js
logo: {
  type: "movieclip",
  tube: "main",
  movieclip: "logo",
  play: "appear",
  loop: false,
  framerate: 30,
  interpolate: true,
},
```

- `tube` is the key in `TubesList`
- `movieclip` is a `<sequence name="...">` in the XML
- `play` is a frame label. Playback starts at that label and runs until the next label
- `loop` repeats that range

Buttons can be clips too. `settingsCheckbox` in `src/js/data_ui_components.js` is a `BUTTONMOVIECLIP` on the `checkbox` sequence, with labels `off`, `turnon`, `on`, and `turnoff`.

From code, once the tube is loaded:

```js
const clip = window.alltubes.main.getMovieClip("logo")
clip.playLabel("appear")
parent.addChild(clip)
```

`MovieClip` extends a Pixi `Container`. Useful calls: `playLabel(label, onDone)`, `play(onDone)`, `setFrame(index)`, `gotoAndStop`-style use is `setFrame`. Tint helpers: `tintInstance(instanceName, color)` and `tintWildcard(prefix, color)`.

## Tick

Clips only advance while they are registered. Creating a clip through the dialog system or `getMovieClip` adds it to `tubeManager` (`src/js/dome/flashtubemanager.js`). `MainClass.mainTick` calls `tubeManager.tick(deltaTime)` every frame. If you construct a clip and it never moves, it is not in that list.

## Sound labels

A frame label that starts with `sound_` is a sync marker, not a play range. Comma-separated labels work (`sound_click,press`). When playback crosses that frame, `MovieClip` raises:

```js
GameEvents.raise(GameEvents.events.FLASH_TUBE_SOUND, {
  soundLabel, // "sound_click"
  clipName,
  frame,
  playLabel,
})
```

Listen in `src/js/gameevents.js` consumers and play a Howl from `src/js/soundlibrary.js`. Do not name a real animation `sound_*`.

## Where a new experiment starts

- `src/js/game.js` — shown after load. It opens the `home` dialog.
- `src/js/data_ui_dialogs.js` — dialog pages. `home` is the sound and music page (`DialogSettings` handles `soundon` / `soundoff` / `musicon` / `musicoff`).
- `src/js/gameShell.js` — preload, music, options menu. It preloads every entry in `TubeDefinitions`.

UI click sounds are `src/s/ui-button-down.mp3` and `src/s/ui-button-up.mp3`. Toggle sounds are `ui-toggle-on.mp3` and `ui-toggle-off.mp3`. Music is `src/s/music.mp3`, played by `MusicManager` in `src/js/music.js`. Sound and music are stored on biodata as `Sound` and `Music`. `setSfxMuted` mutes effects and leaves music playing.
