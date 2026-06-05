import os
import re
import math
import hashlib
import tempfile
from pathlib import Path

import pandas as pd
import streamlit as st

try:
    from gtts import gTTS
except Exception:
    gTTS = None

try:
    import pyttsx3
except Exception:
    pyttsx3 = None


APP_TITLE = "Tourism Chatbot"
DEFAULT_CSV = "Jk_expand_tripadvisor.csv"
CACHE_DIR = Path("tts_cache")
CACHE_DIR.mkdir(exist_ok=True)


st.set_page_config(
    page_title=APP_TITLE,
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="expanded",
)


def normalize_text(value) -> str:
    if pd.isna(value):
        return ""
    text = str(value).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def safe_float(value):
    try:
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


@st.cache_data(show_spinner=False)
def load_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df = df.copy()

    text_cols = [
        "place_name", "district", "category", "tags", "activities",
        "best_season", "vibe", "image_url", "tripadvisor_description",
        "review_1", "review_2", "review_3", "review_4", "tripadvisor_location",
        "tripadvisor_thumbnail"
    ]

    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].fillna("")

    for col in ["tripadvisor_rating", "tripadvisor_review_count", "latitude", "longitude"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["search_blob"] = df.apply(
        lambda r: " ".join(
            [
                normalize_text(r.get("place_name")),
                normalize_text(r.get("district")),
                normalize_text(r.get("category")),
                normalize_text(r.get("tags")),
                normalize_text(r.get("activities")),
                normalize_text(r.get("best_season")),
                normalize_text(r.get("vibe")),
                normalize_text(r.get("tripadvisor_location")),
            ]
        ),
        axis=1,
    )
    return df


def category_list(df: pd.DataFrame):
    cats = sorted([c for c in df["category"].dropna().astype(str).unique().tolist() if c.strip()])
    return ["All"] + cats


def score_row(row: pd.Series, query: str, selected_category: str | None = None) -> float:
    query_n = normalize_text(query)
    tokens = [t for t in query_n.split() if len(t) > 1]
    blob = row.get("search_blob", "")

    score = 0.0

    place = normalize_text(row.get("place_name"))
    district = normalize_text(row.get("district"))
    category = normalize_text(row.get("category"))
    tags = normalize_text(row.get("tags"))
    activities = normalize_text(row.get("activities"))
    vibe = normalize_text(row.get("vibe"))
    season = normalize_text(row.get("best_season"))
    location = normalize_text(row.get("tripadvisor_location"))

    if selected_category and selected_category != "All":
        if normalize_text(selected_category) == category:
            score += 8
        else:
            score -= 6

    if query_n:
        if place and place in query_n:
            score += 18
        if district and district in query_n:
            score += 6
        if category and category in query_n:
            score += 10
        if vibe and vibe in query_n:
            score += 3
        if season and season in query_n:
            score += 2
        if location and location in query_n:
            score += 2

        for token in tokens:
            if token in place:
                score += 7
            if token in district:
                score += 3
            if token in category:
                score += 4
            if token in tags:
                score += 2
            if token in activities:
                score += 2
            if token in vibe:
                score += 1
            if token in season:
                score += 1
            if token in blob:
                score += 0.4

    rating = safe_float(row.get("tripadvisor_rating"))
    reviews = safe_float(row.get("tripadvisor_review_count"))

    if rating is not None:
        score += rating * 1.5
    if reviews is not None:
        score += min(math.log1p(reviews) / 2.0, 4.0)

    return score


def search_places(df: pd.DataFrame, query: str, selected_category: str = "All", limit: int = 5) -> pd.DataFrame:
    if df.empty:
        return df

    working = df.copy()

    if selected_category and selected_category != "All":
        cat_norm = normalize_text(selected_category)
        working = working[working["category"].fillna("").map(normalize_text) == cat_norm]

    if working.empty:
        return working

    if query.strip():
        working = working.copy()
        working["score"] = working.apply(lambda r: score_row(r, query, selected_category), axis=1)
        working = working.sort_values(["score", "tripadvisor_rating", "tripadvisor_review_count"], ascending=False)
    else:
        working = working.sort_values(["tripadvisor_rating", "tripadvisor_review_count"], ascending=False)

    return working.head(limit)


def format_rating(row: pd.Series) -> str:
    rating = safe_float(row.get("tripadvisor_rating"))
    count = safe_float(row.get("tripadvisor_review_count"))
    if rating is None and count is None:
        return "Tripadvisor rating not available"
    if rating is not None and count is not None:
        return f"Tripadvisor rating: {rating:.1f}/5 based on {int(count):,} reviews."
    if rating is not None:
        return f"Tripadvisor rating: {rating:.1f}/5."
    return f"Tripadvisor review count: {int(count):,}."


def build_place_summary(row: pd.Series) -> str:
    parts = []
    name = str(row.get("place_name", "")).strip()
    district = str(row.get("district", "")).strip()
    category = str(row.get("category", "")).strip()
    season = str(row.get("best_season", "")).strip()
    vibe = str(row.get("vibe", "")).strip()
    activities = str(row.get("activities", "")).strip()
    location = str(row.get("tripadvisor_location", "")).strip()

    if name:
        parts.append(f"{name}.")
    if district:
        parts.append(f"District: {district}.")
    if category:
        parts.append(f"Category: {category}.")
    if season:
        parts.append(f"Best season: {season}.")
    if vibe:
        parts.append(f"Vibe: {vibe}.")
    if activities:
        parts.append(f"Activities: {activities}.")
    parts.append(format_rating(row))
    if location:
        parts.append(f"Location: {location}.")

    return " ".join(parts)


def extract_best_matches(df: pd.DataFrame, query: str, selected_category: str = "All", limit: int = 5) -> pd.DataFrame:
    return search_places(df, query, selected_category=selected_category, limit=limit)


def detect_place_match(df: pd.DataFrame, query: str):
    q = normalize_text(query)
    if not q:
        return None

    exact = df[df["place_name"].fillna("").map(normalize_text) == q]
    if not exact.empty:
        return exact.iloc[0]

    contains = df[df["place_name"].fillna("").map(normalize_text).apply(lambda x: x in q or q in x)]
    if not contains.empty:
        return contains.iloc[0]

    return None


def detect_intent(query: str) -> str:
    q = normalize_text(query)
    if any(word in q for word in ["recommend", "suggest", "best", "top", "where should i go", "places to visit", "show me"]):
        return "recommendation"
    if any(word in q for word in ["about", "tell me about", "describe", "information", "details", "info"]):
        return "information"
    return "general"


def generate_reply(df: pd.DataFrame, query: str, selected_category: str = "All"):
    query = query.strip()
    intent = detect_intent(query)

    place_row = detect_place_match(df, query)
    matches = extract_best_matches(df, query, selected_category=selected_category, limit=5)

    if place_row is not None:
        reply = build_place_summary(place_row)
        if "tripadvisor_description" in place_row.index and str(place_row.get("tripadvisor_description", "")).strip():
            reply += f" Description: {str(place_row.get('tripadvisor_description')).strip()}"
        return reply, matches, place_row

    if matches.empty:
        return (
            "I could not find a direct match in the dataset. Try a place name, a district, or a category such as Lake, Temple, Hill Station, Garden, Buddhist pilgrimage, or Muslim pilgrimage.",
            matches,
            None,
        )

    if intent == "recommendation":
        intro = "Here are the best matches from your dataset:"
    elif intent == "information":
        intro = "Here are the closest matches from your dataset:"
    else:
        intro = "I found these relevant places in your dataset:"

    lines = [intro]
    for i, (_, row) in enumerate(matches.iterrows(), start=1):
        name = str(row.get("place_name", "")).strip()
        district = str(row.get("district", "")).strip()
        category = str(row.get("category", "")).strip()
        season = str(row.get("best_season", "")).strip()
        rating = safe_float(row.get("tripadvisor_rating"))
        rating_text = f"{rating:.1f}/5" if rating is not None else "rating not available"
        lines.append(
            f"{i}. {name} — {category}, {district}. Best season: {season or 'not available'}. Tripadvisor: {rating_text}."
        )

    return "\n".join(lines), matches, None


def tts_to_file(text: str) -> str | None:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None

    key = hashlib.md5(text.encode("utf-8")).hexdigest()
    mp3_path = CACHE_DIR / f"{key}.mp3"
    wav_path = CACHE_DIR / f"{key}.wav"

    if mp3_path.exists():
        return str(mp3_path)

    if wav_path.exists():
        return str(wav_path)

    if gTTS is not None:
        try:
            gTTS(text=text, lang="en", slow=False).save(str(mp3_path))
            return str(mp3_path)
        except Exception:
            pass

    if pyttsx3 is not None:
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", 165)
            engine.save_to_file(text, str(wav_path))
            engine.runAndWait()
            return str(wav_path)
        except Exception:
            pass

    return None


def render_place_card(row: pd.Series):
    with st.container(border=True):
        st.subheader(str(row.get("place_name", "Place")))
        cols = st.columns(3)
        cols[0].metric("Category", str(row.get("category", "N/A")))
        cols[1].metric("District", str(row.get("district", "N/A")))
        rating = safe_float(row.get("tripadvisor_rating"))
        cols[2].metric("Rating", f"{rating:.1f}" if rating is not None else "N/A")
        st.caption(f"Best season: {row.get('best_season', 'N/A')} | Vibe: {row.get('vibe', 'N/A')}")
        activities = str(row.get("activities", "")).strip()
        if activities:
            st.write(f"Activities: {activities}")
        tags = str(row.get("tags", "")).strip()
        if tags:
            st.write(f"Tags: {tags}")
        location = str(row.get("tripadvisor_location", "")).strip()
        if location:
            st.write(f"Location: {location}")


def reset_chat():
    st.session_state.messages = [
        {
            "role": "assistant",
            "content": (
                "Hello. I can answer questions about places in your dataset and recommend destinations by category, district, tags, or activities."
            ),
        }
    ]


def main():
    st.title("Tourism Chatbot")
    st.write(
        "This chatbot reads directly from your CSV file, gives short factual answers, recommends places, and can play text-to-speech audio."
    )

    with st.sidebar:
        st.header("Data source")
        csv_path = st.text_input("CSV file path", value=DEFAULT_CSV)
        tts_enabled = st.toggle("Text to speech", value=True)
        selected_category = st.selectbox("Category filter", options=["All"], index=0)
        top_n = st.slider("Number of results", min_value=3, max_value=10, value=5, step=1)

        if st.button("Reload dataset"):
            st.cache_data.clear()
            st.rerun()

        if st.button("Reset chat"):
            reset_chat()
            st.rerun()

    if not csv_path or not Path(csv_path).exists():
        st.error(
            f"CSV file not found: {csv_path}. Put the CSV next to this app or update the path in the sidebar."
        )
        st.stop()

    df = load_data(csv_path)

    # Update category options after loading data
    with st.sidebar:
        category_options = category_list(df)
        if "selected_category_value" not in st.session_state:
            st.session_state.selected_category_value = "All"
        st.session_state.selected_category_value = st.selectbox(
            "Category filter",
            options=category_options,
            index=category_options.index(st.session_state.selected_category_value)
            if st.session_state.selected_category_value in category_options
            else 0,
            key="category_selectbox",
        )
        selected_category = st.session_state.selected_category_value

    if "messages" not in st.session_state:
        reset_chat()

    tabs = st.tabs(["Chat", "Browse dataset", "How it works"])

    with tabs[0]:
        for msg in st.session_state.messages:
            with st.chat_message(msg["role"]):
                st.write(msg["content"])

        user_query = st.chat_input("Ask about a place, district, category, or request recommendations.")
        if user_query:
            st.session_state.messages.append({"role": "user", "content": user_query})
            with st.chat_message("user"):
                st.write(user_query)

            reply, matches, matched_place = generate_reply(
                df,
                user_query,
                selected_category=selected_category,
            )

            st.session_state.messages.append({"role": "assistant", "content": reply})
            with st.chat_message("assistant"):
                st.write(reply)

                if matched_place is not None:
                    with st.expander("Matched place details", expanded=True):
                        render_place_card(matched_place)

                if not matches.empty:
                    with st.expander("Recommended results", expanded=False):
                        for _, row in matches.head(top_n).iterrows():
                            render_place_card(row)

                if tts_enabled:
                    audio_file = tts_to_file(reply)
                    if audio_file:
                        st.audio(audio_file)
                    else:
                        st.info("Text-to-speech could not be generated in this environment.")

    with tabs[1]:
        st.subheader("Dataset preview")
        if selected_category != "All":
            preview_df = df[df["category"] == selected_category].copy()
        else:
            preview_df = df.copy()

        query_text = st.text_input("Search places", value="", placeholder="Type a place, district, category, or activity")
        filtered = search_places(preview_df, query_text, selected_category=selected_category, limit=top_n * 2)

        st.caption(f"{len(filtered)} result(s) shown.")
        if filtered.empty:
            st.warning("No matching records found.")
        else:
            for _, row in filtered.head(top_n).iterrows():
                render_place_card(row)

        with st.expander("Raw data"):
            st.dataframe(filtered, use_container_width=True)

    with tabs[2]:
        st.markdown(
            """
            **Behavior**
            - Answers are based on the rows in your CSV file.
            - Responses are factual and short.
            - Recommendations are ranked using place name, district, category, tags, activities, vibe, rating, and review count.
            - Audio narration is generated from the chatbot response text.

            **Ready-to-use dataset fields**
            - place_name
            - district
            - category
            - tags
            - activities
            - best_season
            - vibe
            - tripadvisor_rating
            - tripadvisor_review_count
            - tripadvisor_location

            **Run command**
            ```bash
            streamlit run app.py
            ```
            """
        )

    st.caption(f"Loaded {len(df)} places from the CSV.")


if __name__ == "__main__":
    main()
