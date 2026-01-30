export const drawingWords = [
  // Easy words
  "cat", "dog", "house", "tree", "car", "sun", "moon", "star", "fish", "bird",
  "apple", "banana", "flower", "heart", "smile", "ball", "book", "chair", "table", "door",
  "window", "cloud", "rain", "snow", "fire", "water", "mountain", "beach", "boat", "plane",
  
  // Medium words
  "elephant", "giraffe", "butterfly", "rainbow", "guitar", "piano", "camera", "glasses",
  "umbrella", "backpack", "bicycle", "rocket", "castle", "bridge", "lighthouse", "iceberg",
  "volcano", "tornado", "telescope", "microscope", "robot", "dragon", "unicorn", "mermaid",
  
  // Harder words
  "skateboard", "helicopter", "submarine", "pyramid", "skyscraper", "rollercoaster",
  "trampoline", "parachute", "snowman", "sandcastle", "mushroom", "octopus", "penguin",
  "flamingo", "kangaroo", "waterfall", "constellation", "windmill", "treasure chest"
];

export function getRandomWord(): string {
  return drawingWords[Math.floor(Math.random() * drawingWords.length)];
}

export function getRandomWords(count: number): string[] {
  const shuffled = [...drawingWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
