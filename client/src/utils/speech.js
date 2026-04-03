export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text, language) {
  if (!text) return;
  
  if (!('speechSynthesis' in window)) {
    alert("Sorry, your browser doesn't support text to speech!");
    return;
  }

  // Stop any currently playing speech
  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);

  // Map to proper BCP 47 language tags
  const langMap = {
    'Malayalam': 'ml-IN',
    'Tamil': 'ta-IN',
    'Hindi': 'hi-IN',
    'English': 'en-US'
  };

  // Set language if it exists in map, defaults to en-US or let browser decide
  if (language && langMap[language]) {
    utterance.lang = langMap[language];
  } else {
    // Default to en-US if language matches 'English' roughly or not mapped
    if (language === 'en' || language === 'English') {
      utterance.lang = 'en-US';
    }
  }

  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}
