from pathlib import Path
from banglatts import BanglaTTS

def runTTS(text, output_file="output.wav", voice='female'):

    print(f"Converting text to speech: '{text}'")
    script_dir = Path(__file__).parent
    tts_models_dir = script_dir / "tts_models"
    tts_models_dir.mkdir(exist_ok=True)  # Ensure the directory exists

    tts = BanglaTTS(save_location=str(tts_models_dir))
    path = tts(text, voice=voice, filename=output_file)
    print(f"Audio saved to {path}")
    return path


# Example usage
if __name__ == "__main__":
    bangla_text = "দেখা যাক ইন্টারনেট থেকে এই বিনামূল্যের লাইব্রেরির রানটাইম এক লাইনেরও বেশি লম্বা বক্তৃতা ব্যবহার করে কেমন চলছে। যদি এটি ভালোভাবে কাজ করে, তাহলে প্রকল্পটি সোনালী।"
    tts_output_file = "bangla_speech.wav"
    runTTS(bangla_text, output_file=tts_output_file)
    print(f"Generated speech for '{bangla_text}' saved to {tts_output_file}")

