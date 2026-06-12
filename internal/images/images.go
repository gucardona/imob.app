package images

import (
	"bytes"
	"fmt"
	"image"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
)

const (
	thumbWidth  = 800
	grandeWidth = 1600
	jpegQuality = 85
)

// Paths holds the on-disk file names (relative to the destination directory)
// of the three variants produced for an uploaded photo.
type Paths struct {
	Original string
	Thumb    string
	Grande   string
}

// SaveVariants decodes image data, writes the original (re-encoded as JPEG for
// consistency) plus "thumb" (~400px wide) and "grande" (~1600px wide) resized
// variants into destDir, named "<baseName>-<variant>.jpg". Images narrower than
// a variant's target width are kept at their original size (no upscaling).
func SaveVariants(data []byte, destDir, baseName string) (Paths, error) {
	img, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return Paths{}, fmt.Errorf("decoding image: %w", err)
	}

	paths := Paths{
		Original: baseName + "-original.jpg",
		Thumb:    baseName + "-thumb.jpg",
		Grande:   baseName + "-grande.jpg",
	}

	if err := saveResized(img, destDir, paths.Original, img.Bounds().Dx()); err != nil {
		return Paths{}, err
	}
	if err := saveResized(img, destDir, paths.Thumb, thumbWidth); err != nil {
		return Paths{}, err
	}
	if err := saveResized(img, destDir, paths.Grande, grandeWidth); err != nil {
		return Paths{}, err
	}

	return paths, nil
}

func saveResized(img image.Image, destDir, fileName string, targetWidth int) error {
	resized := img
	if img.Bounds().Dx() > targetWidth {
		resized = imaging.Resize(img, targetWidth, 0, imaging.Lanczos)
	}

	if err := os.MkdirAll(destDir, 0o755); err != nil {
		return fmt.Errorf("creating directory %s: %w", destDir, err)
	}

	dest := filepath.Join(destDir, fileName)
	if err := imaging.Save(resized, dest, imaging.JPEGQuality(jpegQuality)); err != nil {
		return fmt.Errorf("saving %s: %w", dest, err)
	}

	return nil
}
