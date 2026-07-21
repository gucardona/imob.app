package images_test

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
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

	paths, err := images.SaveVariants(bytes.NewReader(data), dir, "foto-1")
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

	paths, err := images.SaveVariants(bytes.NewReader(data), dir, "foto-pequena")
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
	data := sampleJPEG(t, 1800, 1200)

	paths, err := images.SaveVariants(bytes.NewReader(data), dir, "full-res")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	w, h := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Original)))
	if w != 1800 || h != 1200 {
		t.Errorf("expected original 1800x1200, got %dx%d", w, h)
	}
}

func TestSaveVariants_RejectsInvalidImageData(t *testing.T) {
	dir := t.TempDir()

	if _, err := images.SaveVariants(bytes.NewReader([]byte("not an image")), dir, "bad"); err == nil {
		t.Error("expected an error for invalid image data")
	}
}

func TestSaveVariants_CapsOriginalWidth(t *testing.T) {
	dir := t.TempDir()
	data := sampleJPEG(t, 3000, 2000)

	paths, err := images.SaveVariants(bytes.NewReader(data), dir, "large")
	if err != nil {
		t.Fatalf("SaveVariants returned error: %v", err)
	}

	w, _ := decodeDimensions(t, filepath.Join(dir, filepath.Base(paths.Original)))
	if w != 1920 {
		t.Errorf("expected original width capped at 1920, got %d", w)
	}
}

func TestSaveVariants_RejectsHugePixelCountBeforeDecode(t *testing.T) {
	dir := t.TempDir()
	data := pngHeaderOnly(9000, 4000)

	if _, err := images.SaveVariants(bytes.NewReader(data), dir, "huge"); err == nil {
		t.Fatal("expected huge image dimensions to be rejected")
	}
}

func pngHeaderOnly(width, height uint32) []byte {
	var out bytes.Buffer
	out.Write([]byte{137, 80, 78, 71, 13, 10, 26, 10})
	var ihdr bytes.Buffer
	_ = binary.Write(&ihdr, binary.BigEndian, width)
	_ = binary.Write(&ihdr, binary.BigEndian, height)
	ihdr.Write([]byte{8, 2, 0, 0, 0})
	writePNGChunk(&out, "IHDR", ihdr.Bytes())
	writePNGChunk(&out, "IEND", nil)
	return out.Bytes()
}

func writePNGChunk(out *bytes.Buffer, typ string, data []byte) {
	_ = binary.Write(out, binary.BigEndian, uint32(len(data)))
	out.WriteString(typ)
	out.Write(data)
	crc := crc32.NewIEEE()
	crc.Write([]byte(typ))
	crc.Write(data)
	_ = binary.Write(out, binary.BigEndian, crc.Sum32())
}
