import sys
import os
import json
import warnings

# Suppress warnings and tensorflow logs
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, Activation, Dropout, MaxPooling1D, Flatten, Dense

EMOTIONS = [
    "female_angry",
    "female_calm",
    "female_fearful",
    "female_happy",
    "female_sad",
    "male_angry",
    "male_calm",
    "male_fearful",
    "male_happy",
    "male_sad"
]

def build_model():
    model = Sequential()
    
    # Layer 1
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_7", input_shape=(216, 1)))
    model.add(Activation("relu", name="activation_8"))
    
    # Layer 2
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_8"))
    model.add(Activation("relu", name="activation_9"))
    model.add(Dropout(0.1, name="dropout_3"))
    model.add(MaxPooling1D(pool_size=8, strides=8, name="max_pooling1d_2"))
    
    # Layer 3
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_9"))
    model.add(Activation("relu", name="activation_10"))
    
    # Layer 4
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_10"))
    model.add(Activation("relu", name="activation_11"))
    
    # Layer 5
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_11"))
    model.add(Activation("relu", name="activation_12"))
    model.add(Dropout(0.2, name="dropout_4"))
    
    # Layer 6
    model.add(Conv1D(filters=128, kernel_size=5, padding="same", name="conv1d_12"))
    model.add(Activation("relu", name="activation_13"))
    
    # Output Layers
    model.add(Flatten(name="flatten_2"))
    model.add(Dense(units=10, name="dense_2"))
    model.add(Activation("softmax", name="activation_14"))
    
    return model

def process_audio(file_path):
    # Load 2.5 seconds of audio at 44100Hz starting from 0.5s offset
    X, sample_rate = librosa.load(file_path, res_type='kaiser_fast', duration=2.5, sr=44100, offset=0.5)
    
    # Extract MFCC and take the mean along the coefficient axis
    mfccs = np.mean(librosa.feature.mfcc(y=X, sr=sample_rate, n_mfcc=13), axis=0)
    
    # Ensure features shape is exactly 216 (pad with zeros or truncate if necessary)
    target_len = 216
    if len(mfccs) < target_len:
        mfccs = np.pad(mfccs, (0, target_len - len(mfccs)), "constant")
    elif len(mfccs) > target_len:
        mfccs = mfccs[:target_len]
        
    return mfccs

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio path provided"}))
        return

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(json.dumps({"error": "Audio file does not exist"}))
        return

    try:
        # Extract features
        features = process_audio(audio_path)
        
        # Prepare input dimensions (1, 216, 1)
        model_input = np.expand_dims(features, axis=(0, 2))
        
        # Reconstruct CNN model & load pre-trained weights
        model = build_model()
        
        # Locate weights
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        weights_path = os.path.join(base_dir, "Speech-Emotion-Analyzer", "saved_models", "Emotion_Voice_Detection_Model.h5")
        
        if not os.path.exists(weights_path):
            # Fallback path if run in alternative cwd
            weights_path = r"C:\Users\suriya prakash\.gemini\antigravity\scratch\eartranslate\server\Speech-Emotion-Analyzer\saved_models\Emotion_Voice_Detection_Model.h5"
            
        model.load_weights(weights_path)
        
        # Run prediction
        predictions = model.predict(model_input, verbose=0)[0]
        max_idx = int(np.argmax(predictions))
        
        detected = EMOTIONS[max_idx]
        confidence = float(predictions[max_idx])
        
        # Split gender and mood tags
        gender = "female" if max_idx < 5 else "male"
        mood = detected.split("_")[1]
        
        # Format probabilities dictionary
        probs = {EMOTIONS[i]: float(predictions[i]) for i in range(10)}
        
        print(json.dumps({
            "success": True,
            "detected": detected,
            "gender": gender,
            "mood": mood,
            "confidence": confidence,
            "probabilities": probs
        }))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
