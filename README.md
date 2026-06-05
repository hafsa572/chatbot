# Tourism Chatbot

A simple, fully functional tourism chatbot that reads from your CSV file, recommends places, and speaks the reply using text-to-speech.

## Files
- `app.py`
- `requirements.txt`
- `Jk_expand_tripadvisor.csv`

## Run
```bash
pip install -r requirements.txt
streamlit run app.py
```

## Notes
- Put the CSV file in the same folder as `app.py`, or change the CSV path in the sidebar.
- If gTTS is unavailable, the app will try pyttsx3 as a fallback.
- The chatbot gives factual, short responses based on the dataset.
