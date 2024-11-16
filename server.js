const express = require('express');
const pixelmatch = require('pixelmatch');
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/compare', async (req, res) => {
  try {
    const { baseImageUrl, sheetImageUrls } = req.body;

    // Carga la imagen base
    const baseImage = await loadImage(baseImageUrl);
    const baseCanvas = createCanvas(baseImage.width, baseImage.height);
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx.drawImage(baseImage, 0, 0);
    const baseImageData = baseCtx.getImageData(0, 0, baseImage.width, baseImage.height);

    let bestMatchIndex = -1;
    let lowestDifference = Infinity;

    for (let i = 0; i < sheetImageUrls.length; i++) {
      const sheetImage = await loadImage(sheetImageUrls[i]);
      const sheetCanvas = createCanvas(sheetImage.width, sheetImage.height);
      const sheetCtx = sheetCanvas.getContext('2d');
      sheetCtx.drawImage(sheetImage, 0, 0);

      const sheetImageData = sheetCtx.getImageData(0, 0, sheetImage.width, sheetImage.height);
      const diffCanvas = createCanvas(sheetImage.width, sheetImage.height);
      const diffCtx = diffCanvas.getContext('2d');
      const diff = diffCtx.createImageData(sheetImage.width, sheetImage.height);

      const mismatchedPixels = pixelmatch(
        baseImageData.data,
        sheetImageData.data,
        diff.data,
        sheetImage.width,
        sheetImage.height,
        { threshold: 0.1 }
      );

      if (mismatchedPixels < lowestDifference) {
        lowestDifference = mismatchedPixels;
        bestMatchIndex = i;
      }
    }

    res.json({ bestMatchIndex });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing images' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
