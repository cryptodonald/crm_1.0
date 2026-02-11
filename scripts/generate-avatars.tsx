import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Avatar from 'boring-avatars';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Avatar definitivi scelti
const avatars = [
  { file: 'male.svg',    name: 'Erik Lindberg', colors: ['#312E81', '#A5B4FC'] },  // Indaco scuro + Lavanda
  { file: 'female.svg',  name: 'Yuki Sato',     colors: ['#FF2D55', '#FF6482'] },  // Rosa intenso + Rosa chiaro
  { file: 'neutral.svg', name: 'Noa Berger',     colors: ['#78716C', '#D6D3D1'] },  // Grigio caldo
];

const generateAvatars = () => {
  const avatarsDir = join(process.cwd(), 'public', 'avatars');

  for (const { file, name, colors } of avatars) {
    const svg = renderToStaticMarkup(
      <Avatar name={name} variant="beam" size={120} colors={colors} />
    );
    writeFileSync(join(avatarsDir, file), svg);
    console.log(`✓ ${file}  ("${name}")  [${colors.join(', ')}]`);
  }
};

generateAvatars();
