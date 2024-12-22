// Importing essential libraries
const record = require('node-record-lpcm16');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Helper function to safely delete a file
function safeDeleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Successfully deleted: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
    }
}

function convertTo16kHz(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        console.log(`Converting ${inputFile} to 16kHz...`);
        const command = `ffmpeg -i "${inputFile}" -ar 16000 "${outputFile}"`;
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

function recordAudio(outputFile) {
    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
    }

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputFile, { encoding: 'binary' });
        console.log('Recording audio...');
        
        const recording = record
            .record({ sampleRate: 44100, threshold: 0.5 })
            .stream()
            .pipe(file);

        recording.on('finish', () => {
            console.log('Recording complete.');
            resolve(outputFile);
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

function transcribeAudio(audioPath, outputTextFile) {
    return new Promise((resolve, reject) => {
        console.log('Transcribing audio...');
        
        // Define paths
        const whisperPath = path.resolve(__dirname, 'whisper.cpp');
        const modelPath = path.resolve(whisperPath, 'build/bin/main');
        const modelFile = path.resolve(whisperPath, 'models', 'ggml-base.en.bin');

        // Change working directory to whisper.cpp directory
        const currentDir = process.cwd();
        process.chdir(whisperPath);

        // Validate paths
        if (!fs.existsSync(modelPath)) {
            process.chdir(currentDir);
            reject(new Error(`Whisper executable not found at: ${modelPath}`));
            return;
        }

        if (!fs.existsSync(modelFile)) {
            process.chdir(currentDir);
            reject(new Error(
                `Whisper model file not found at: ${modelFile}\n` +
                'Please download the model by running:\n' +
                'cd whisper.cpp && bash ./models/download-ggml-model.sh base.en'
            ));
            return;
        }

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputTextFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Run transcription with relative paths from whisper.cpp directory
        const relativeModelPath = path.relative(whisperPath, modelFile);
        const relativeAudioPath = path.relative(whisperPath, audioPath);
        const relativeOutputPath = path.relative(whisperPath, outputTextFile);
        
        const command = `"${modelPath}" -m "${relativeModelPath}" -f "${relativeAudioPath}" -otxt -of "${relativeOutputPath}"`;
        console.log('Running command:', command);

        exec(command, (error, stdout, stderr) => {
            // Change back to original directory
            process.chdir(currentDir);

            if (error) {
                console.error('Error during transcription:', error);
                console.error('Command output:', stderr);
                reject(error);
                return;
            }
            
            // Check for both possible file paths (with and without .txt extension)
            const possiblePaths = [
                outputTextFile,
                `${outputTextFile}.txt`
            ];

            const existingFile = possiblePaths.find(p => fs.existsSync(p));
            
            if (existingFile) {
                const transcription = fs.readFileSync(existingFile, 'utf8');
                console.log('Transcription saved to:', existingFile);
                resolve(transcription.trim());
            } else {
                reject(new Error('Transcription file was not created'));
            }
        });
    });
}

function outputTranscription(text, outputFile) {
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const data = JSON.stringify({ transcription: text }, null, 2);
    fs.writeFileSync(outputFile, data);
    console.log(`Transcription JSON saved as ${outputFile}`);
}

// Example Execution:
(async () => {
    try {
        const baseDir = __dirname;
        const audioFile = path.join(baseDir, 'test.wav');
        const convertedAudioFile = path.join(baseDir, 'converted_test.wav');
        const transcriptionTextFile = path.join(baseDir, 'transcription.txt'); // Added .txt extension
        const transcriptionJsonFile = path.join(baseDir, 'transcription.json');

        await recordAudio(audioFile);
        await convertTo16kHz(audioFile, convertedAudioFile);
        const transcription = await transcribeAudio(convertedAudioFile, transcriptionTextFile);
        outputTranscription(transcription, transcriptionJsonFile);

        // Cleanup converted file
        safeDeleteFile(convertedAudioFile);
        safeDeleteFile(audioFile); // Also cleanup the original recording

    } catch (error) {
        console.error('Error during process:', error);
    } finally {
        process.exit(0);
    }
})();