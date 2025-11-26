import speech_recognition as sr

print("Finding all available microphones...")
print("-" * 30)

mic_list = sr.Microphone.list_microphone_names()

if not mic_list:
    print("NO MICROPHONES FOUND. This is the problem.")
    print("Please check your hardware and system settings.")
else:
    print("Found these microphones:")
    for index, name in enumerate(mic_list):
        print(f"  Mic #{index}: {name}")

print("-" * 30)
print("\nThe script will try to use the 'default' mic.")
