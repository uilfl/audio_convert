// Importing essential libraries
const record = require('node-record-lpcm16');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
function convertTo16kHz(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        console.log(`Converting ${inputFile} to 16kHz...`);

        // FFmpeg command
        const command = `ffmpeg -i ${inputFile} -ar 16000 ${outputFile}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error during conversion:', error);
                reject(error);
                return;
            }
            console.log(`Conversion complete. Output file: ${outputFile}`);
            resolve(outputFile);
        });
    });
}
// Step 1: Speech Recording
function recordAudio(outputFile) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputFile, { encoding: 'binary' });
        console.log('Recording audio...');
        const recording = record
            .record({ sampleRate: 44100, threshold: 0.5 }).stream() // Use start instead of record
            .pipe(file);

        recording.on('finish', () => {
            console.log('Recording complete.');
            resolve(outputFile); // Resolve when recording finishes
        });

        recording.on('error', (err) => {
            console.error('Recording error:', err);
            reject(err);
        });
        setTimeout(() => {
            console.log('Recording timeout.');
            recording.end();
          }, 10000);
    });  
}

// Step 2: Transcription using whisper.cpp (local setup)
function transcribeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        console.log('Transcribing audio...');
        // Define the path to the whisper.cpp directory
        const whisperPath = path.resolve(__dirname, 'whisper.cpp');
        const modelPath = path.resolve(__dirname, 'whisper.cpp/build/bin/main');
    
        exec(`${modelPath} -f ${audioPath} -v `, (error, stdout, stderr) => {
            if (error) {
                console.error('Error during transcription:', error);
                reject(error);
                return;
            }
            console.log('Transcription output:', stdout);
            resolve(stdout.trim()); // Resolve with transcription text
        });
    });
}

// Step 3: Save transcription as a JSON file
function outputTranscription(text) {
    const data = JSON.stringify({ transcription: text }, null, 2);
    fs.writeFileSync('transcription.json', data); // Fixed: Added `fs.` to writeFileSync
    console.log('Transcription saved as transcription.json');
}

// Example Execution:
(async () => {
    try {
        const audioFile = 'path/to/test.wav';
        await recordAudio(audioFile); // Step 1: Record audio
        await convertTo16kHz(audioFile, convertedFile); // Convert to 16 kHz
        const transcription = await transcribeAudio(audioFile); // Step 2: Transcribe audio
        outputTranscription(transcription);
        // Step 3: Save transcription
    } catch (error) {
        console.error('Error during process:', error);
    }
    //finsih the process
    process.exit(0);
})();