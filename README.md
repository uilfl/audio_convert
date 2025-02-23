# 本專案是參考 whisper.cpp 所進行的實現！

# 使用步驟

1. 記得下載 ffmpeg 讓它轉成 16khz audio file
2. 記得貼上你的 wav 的絕對路徑
3. 要記得到這裡下載 models
   link :https://github.com/ggerganov/whisper.cpp
   按照他的指示
   sh ./models/download-ggml-model.sh base.en
   # build the main example
   cmake -B build
   cmake --build build --config Release

# transcribe an audio file

./build/bin/main -f samples/jfk.wav

4. 下載好後就可以直接 run "npm start"
