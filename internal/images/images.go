package images

import (
	"fmt"
	"image"
	"io"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"
)

const (
	thumbWidth       = 800
	grandeWidth      = 1920
	originalMaxWidth = 1920
	maxSourcePixels  = 24000000
	jpegQuality      = 85
)

// Paths holds the on-disk file names (relative to the destination directory)
// of the three variants produced for an uploaded photo.
type Paths struct {
	Original string
	Thumb    string
	Grande   string
}

// SaveVariants decodes image data, rejects images that would exceed the VPS
// pixel budget, and writes web-sized JPEG variants into destDir.
func SaveVariants(src io.ReadSeeker, destDir, baseName string) (Paths, error) {
	cfg, _, err := image.DecodeConfig(src)
	if err != nil {
		return Paths{}, fmt.Errorf("decoding image config: %w", err)
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return Paths{}, fmt.Errorf("invalid image dimensions")
	}
	if cfg.Width*cfg.Height > maxSourcePixels {
		return Paths{}, fmt.Errorf("image dimensions too large: %dx%d exceeds %d pixels", cfg.Width, cfg.Height, maxSourcePixels)
	}
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return Paths{}, fmt.Errorf("rewinding image: %w", err)
	}

	img, err := imaging.Decode(src, imaging.AutoOrientation(true))
	if err != nil {
		return Paths{}, fmt.Errorf("decoding image: %w", err)
	}

	paths := Paths{
		Original: baseName + "-original.jpg",
		Thumb:    baseName + "-thumb.jpg",
		Grande:   baseName + "-grande.jpg",
	}

	if err := saveResized(img, destDir, paths.Original, originalMaxWidth); err != nil {
		return Paths{}, err
	}
	if originalMaxWidth == grandeWidth {
		if err := copyFile(filepath.Join(destDir, paths.Original), filepath.Join(destDir, paths.Grande)); err != nil {
			return Paths{}, err
		}
	} else if err := saveResized(img, destDir, paths.Grande, grandeWidth); err != nil {
		return Paths{}, err
	}
	if err := saveResized(img, destDir, paths.Thumb, thumbWidth); err != nil {
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

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("opening %s: %w", src, err)
	}
	defer in.Close()

	out, err := os.OpenFile(dest, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("creating %s: %w", dest, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		_ = os.Remove(dest)
		return fmt.Errorf("copying %s to %s: %w", src, dest, err)
	}
	return nil
}
