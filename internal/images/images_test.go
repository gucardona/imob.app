package images_test

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"path/filepath"
	"testing"

	"github.com/gucardona/imob.app/internal/images"
)

func sampleJPEG(t *testing.T, width, height int) []byte {
	t.Helper()

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 100, A: 255})
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encoding sample JPEG: %v", err)
	}
	return buf.Bytes()
}

func decodeDimensions(t *testing.T, path string) (int, int) {
	t.Helper()

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("opening %s: %v", path, err)
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		t.Fatalf("decoding config of %s: %v", path, err)
	}
	return cfg.Width, cfg.Height
}

func TestSaveVariants_WritesOriginalThumbAndGrande(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 2000, 1000)

	paths, err := images.SaveVariants(data, dir, "foto-1")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	for _, p := range []string{paths.Original, paths.Thumb, paths.Grande} {
		if _, err := os.Stat(filepath.Join(dir, filepath.Base(p))); err != nil {
			t.Errorf("expected file for %q to exist: %v", p, err)
		}
	}

	thumbW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Thumb)))
	if thumbW != 800 {
		t.Errorf("expected thumb width 800, got %d", thumbW)
	}

	grandeW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Grande)))
	if grandeW != 1920 {
		t.Errorf("expected grande width 1920, got %d", grandeW)
	}
}

func TestSaveVariants_DoesNotUpscaleSmallerImages(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 300, 200)

	paths, err := images.SaveVariants(data, dir, "foto-pequena")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	thumbW, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Thumb)))
	if thumbW != 300 {
		t.Errorf("expected thumb to keep original width 300 (no upscale), got %d", thumbW)
	}
}

func TestSaveVariants_OriginalPreservesSourceDimensions(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 2000, 1333)

	paths, err := images.SaveVariants(data, dir, "full-res")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	w, h := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Original)))
	if w != 2000 || h != 1333 {
		t.Errorf("expected original 2000x1333, got %dx%d", w, h)
	}
}

func TestSaveVariants_RejectsInvalidImageData(t *testing.T) {
	dir := t.TempDir()

	if _, err := images.SaveVariants([]byte("not an image"), dir, "bad"); err == nil {
		t.Error("expected an error for invalid image data")
	}
}
