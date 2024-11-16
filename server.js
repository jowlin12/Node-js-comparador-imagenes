const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const sharp = require('sharp');
const pixelmatch = require('pixelmatch');
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(bodyParser.json());

app.post('/compare', async (req, res) => {
  try {
    const { baseImageUrl, sheetImageUrls } = req.body;

    if (!baseImageUrl || !sheetImageUrls || !Array.isArray(sheetImageUrls)) {
      return res.status(400).json({ error: 'Invalid input. Provide baseImageUrl and sheetImageUrls.' });
    }

    // Descargar y procesar la imagen base
    const baseImageBuffer = await fetch(baseImageUrl).then(res => res.buffer());
    const baseImage = await sharp(baseImageBuffer).resize(200, 200).toBuffer();

    // Variables para almacenar la comparación
    let bestMatchIndex = -1;
    let lowestDifference = Infinity;

    // Procesar y comparar cada imagen del Sheet
    for (let i = 0; i < sheetImageUrls.length; i++) {
      try {
        const sheetImageBuffer = await fetch(sheetImageUrls[i]).then(res => res.buffer());
        const sheetImage = await sharp(sheetImageBuffer).resize(200, 200).toBuffer();

        // Crear canvas para pixelmatch
        const canvas = createCanvas(200, 200);
        const ctx = canvas.getContext('2d');

        const baseImageCanvas = await loadImage(baseImage);
        const sheetImageCanvas = await loadImage(sheetImage);

        ctx.drawImage(baseImageCanvas, 0, 0, 200, 200);
        const baseImageData = ctx.getImageData(0, 0, 200, 200);

        ctx.clearRect(0, 0, 200, 200); // Limpiar el canvas
        ctx.drawImage(sheetImageCanvas, 0, 0, 200, 200);
        const sheetImageData = ctx.getImageData(0, 0, 200, 200);

        // Comparar imágenes
        const diff = pixelmatch(
          baseImageData.data,
          sheetImageData.data,
          null,
          200,
          200,
          { threshold: 0.1 }
        );

        // Actualizar el mejor match
        if (diff < lowestDifference) {
          lowestDifference = diff;
          bestMatchIndex = i;
        }
      } catch (error) {
        console.error(`Error processing image ${sheetImageUrls[i]}:`, error.message);
      }
    }

    res.json({ bestMatchIndex });
  } catch (error) {
    console.error('Error in /compare endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send('Image Comparison API is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
