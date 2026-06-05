from gtts import gTTS

tts = gTTS("Hello Hafsa, your tourism chatbot is working.")
tts.save("test.mp3")

print("Audio generated successfully")