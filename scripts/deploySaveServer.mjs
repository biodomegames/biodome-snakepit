// upload the save-server system (saving snapshot as public key) to 

import { Client } from "ssh2";
import path from "path";
import fs from "fs/promises";

const conn = new Client();

const config = {
    host: "192.168.2.182",
    username: "tobias",
    port: 22,
    remoteRoot: "/home/tobias/save-server",
    localRoot: "server/",
};

// Recursive function to upload files and directories
async function uploadDirectory(sftp, localDir, remoteDir) {
    try {
        // Ensure remote directory exists
        await new Promise((resolve, reject) => {
            sftp.mkdir(remoteDir, (err) => {
                if (err && err.code !== 4) reject(err); // Ignore "folder already exists" error
                else resolve();
            });
        });

        const files = await fs.readdir(localDir, { withFileTypes: true });

        for (const file of files) {
            const localPath = path.join(localDir, file.name);
            const remotePath = path.join(remoteDir, file.name);
            let fileextension = path.extname(file.name);
            //console.log("fileextension: " + fileextension);
            if (file.isDirectory()) {
                //console.log(`Creating directory: ${remotePath}`);
                await uploadDirectory(sftp, localPath, remotePath);
                
            } else if (fileextension != ".jpg" && fileextension != ".png" && fileextension != ".gif" && fileextension != ".jpeg") {
                
                console.log(`Uploading file: ${localPath} -> ${remotePath}`);
                await new Promise((resolve, reject) => {
                    sftp.fastPut(localPath, remotePath, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }
    } catch (err) {
        console.error(`Error uploading directory ${localDir}:`, err);
    }
}

conn
    .on("ready", async () => {
        console.log("SSH connection ready!");

        conn.sftp(async (err, sftp) => {
            if (err) {
                console.error("Failed to initialize SFTP:", err);
                conn.end();
                return;
            }

            try {
                await uploadDirectory(
                    sftp,
                    path.resolve(config.localRoot), // Absolute path for local directory
                    config.remoteRoot // Remote directory
                );
                console.log("All files uploaded successfully!");
                
                // Restart PM2 process
                console.log("Restarting PM2 process...");
                await new Promise((resolve, reject) => {
                    const restartCommand = 'pm2 restart save-server';
                    console.log(`Executing: ${restartCommand}`);
                    
                    conn.exec(restartCommand, (err, stream) => {
                        if (err) {
                            console.error("Failed to execute restart command:", err);
                            reject(err);
                            return;
                        }
                        
                        let output = '';
                        let errorOutput = '';
                        
                        stream.on('data', (data) => {
                            output += data.toString();
                        });
                        
                        stream.stderr.on('data', (data) => {
                            errorOutput += data.toString();
                        });
                        
                        stream.on('close', (code) => {
                            console.log(`PM2 restart completed with code: ${code}`);
                            if (output) console.log("Output:", output);
                            if (errorOutput) console.log("Errors:", errorOutput);
                            
                            if (code === 0) {
                                console.log("PM2 process restarted successfully!");
                            } else {
                                console.error(`PM2 restart failed with code: ${code}`);
                            }
                            resolve();
                        });
                        
                        stream.on('error', (err) => {
                            console.error("Stream error:", err);
                            reject(err);
                        });
                    });
                });
                
            } catch (uploadErr) {
                console.error("Error during upload:", uploadErr);
            } finally {
                conn.end(); // Close the connection after all uploads are complete
                console.log("SSH connection closed.");
            }
        });
    })
    .connect({
        host: config.host,
        port: config.port,
        username: config.username,
        agent: process.env.SSH_AUTH_SOCK, // Use SSH agent
        readyTimeout: 20000, // Increase timeout for slower connections
    });
