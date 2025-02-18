'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Check, Copy, Download } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

const ASCII_CHAR_SETS = {
  minimal: [' ', '.', ':'],
  standard: [' ', '.', '·', ':', '-', '=', '≡', '≣', '▒', '▓'],
  blocks: [' ', '░', '▒', '▓', '█'],
  lines: [' ', '╴', '╶', '─', '╵', '╰', '╭', '─', '╷', '╮', '╯', '│'],
} as const;

type AsciiSetName = keyof typeof ASCII_CHAR_SETS;

const FONT_SIZE_PX = 8;
const CHAR_WIDTH = FONT_SIZE_PX * 0.6;
const LINE_HEIGHT = CHAR_WIDTH;
const TEXT_COLOR = '#4B5563';
const FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export default function AsciiArtGenerator() {
  const [asciiArt, setAsciiArt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [outputWidth, setOutputWidth] = useState(100);
  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [invert, setInvert] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(
    null
  ) as React.RefObject<HTMLCanvasElement>;
  const outputCanvasRef = useRef<HTMLCanvasElement>(
    null
  ) as React.RefObject<HTMLCanvasElement>;
  const [selectedCharSet, setSelectedCharSet] =
    useState<AsciiSetName>('standard');

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const generateAsciiArt = () => {
    if (!imageFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      canvas.width = outputWidth;
      canvas.height = Math.round(outputWidth / aspectRatio);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const asciiImage = convertToAscii(imageData, aspectRatio);
      setAsciiArt(asciiImage);
    };
    img.src = URL.createObjectURL(imageFile);
  };

  const convertToAscii = (
    imageData: ImageData,
    aspectRatio: number
  ): string => {
    const chars = ASCII_CHAR_SETS[selectedCharSet];

    const asciiWidth = outputWidth;
    const asciiHeight = Math.round(asciiWidth / aspectRatio);

    let asciiImage = '';
    for (let y = 0; y < asciiHeight; y++) {
      for (let x = 0; x < asciiWidth; x++) {
        const sampleX = Math.floor((x * imageData.width) / asciiWidth);
        const sampleY = Math.floor((y * imageData.height) / asciiHeight);
        const offset = (sampleY * imageData.width + sampleX) * 4;

        let r = imageData.data[offset];
        let g = imageData.data[offset + 1];
        let b = imageData.data[offset + 2];
        const alpha = imageData.data[offset + 3];

        if (alpha < 128) {
          asciiImage += ' ';
          continue;
        }

        // Apply brightness
        r = Math.min(255, r * brightness);
        g = Math.min(255, g * brightness);
        b = Math.min(255, b * brightness);

        // Apply contrast
        r = Math.min(255, ((r / 255 - 0.5) * contrast + 0.5) * 255);
        g = Math.min(255, ((g / 255 - 0.5) * contrast + 0.5) * 255);
        b = Math.min(255, ((b / 255 - 0.5) * contrast + 0.5) * 255);

        let pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Apply inversion if enabled
        if (invert) {
          pixelBrightness = 1 - pixelBrightness;
        }

        const charIndex = Math.floor(pixelBrightness * (chars.length - 1));
        asciiImage += chars[charIndex];
      }
      asciiImage += '\n';
    }
    return asciiImage;
  };

  const downloadAsPNG = () => {
    if (!outputCanvasRef.current || !asciiArt) return;

    const canvas = outputCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = asciiArt.split('\n');
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    // Calculate dimensions while maintaining aspect ratio
    const canvasWidth = maxLineLength * CHAR_WIDTH;
    const canvasHeight = (lines.length - 1) * LINE_HEIGHT; // Subtract 1 to account for last empty line

    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Set high DPI scaling for better quality
    const scale = window.devicePixelRatio;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= scale;
    canvas.height *= scale;
    ctx.scale(scale, scale);

    // Clear canvas to transparent (removed white background fill)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configure text rendering
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${FONT_SIZE_PX}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Draw each line of text
    lines.forEach((line, index) => {
      ctx.fillText(line, 0, index * LINE_HEIGHT);
    });

    // Create download link with high-quality PNG
    const link = document.createElement('a');
    link.download = 'ascii-art.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <main className="flex flex-row h-screen max-h-screen overflow-hidden">
      <Sidebar
        handleImageUpload={handleImageUpload}
        generateAsciiArt={generateAsciiArt}
        imageFile={imageFile}
        outputWidth={outputWidth}
        setOutputWidth={setOutputWidth}
        contrast={contrast}
        setContrast={setContrast}
        brightness={brightness}
        setBrightness={setBrightness}
        invert={invert}
        setInvert={setInvert}
        selectedCharSet={selectedCharSet}
        setSelectedCharSet={setSelectedCharSet}
      />
      <Canvas
        asciiArt={asciiArt}
        downloadAsPNG={downloadAsPNG}
        canvasRef={canvasRef}
        outputCanvasRef={outputCanvasRef}
      />
    </main>
  );
}

const Sidebar = ({
  handleImageUpload,
  generateAsciiArt,
  imageFile,
  outputWidth,
  setOutputWidth,
  contrast,
  setContrast,
  brightness,
  setBrightness,
  invert,
  setInvert,
  selectedCharSet,
  setSelectedCharSet,
}: {
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  generateAsciiArt: () => void;
  imageFile: File | null;
  outputWidth: number;
  setOutputWidth: (value: number) => void;
  contrast: number;
  setContrast: (value: number) => void;
  brightness: number;
  setBrightness: (value: number) => void;
  invert: boolean;
  setInvert: (value: boolean) => void;
  selectedCharSet: AsciiSetName;
  setSelectedCharSet: (value: AsciiSetName) => void;
}) => {
  return (
    <div className="flex shrink-0 flex-col w-96 p-4 overflow-scroll gap-2 border-r">
      <div className="flex flex-col w-full gap-0 border rounded overflow-hidden">
        <div className="flex flex-col w-full aspect-square border-b">
          {imageFile && (
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className="object-contain aspect-square w-full h-full"
            />
          )}
        </div>

        <Input
          className="w-full rounded-none border-none "
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="width-slider">
            Output Width: {outputWidth} characters
          </Label>
          <Slider
            id="width-slider"
            min={20}
            max={200}
            step={1}
            value={[outputWidth]}
            onValueChange={(value) => setOutputWidth(value[0])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contrast-slider">
            Contrast: {contrast.toFixed(1)}
          </Label>
          <Slider
            id="contrast-slider"
            min={0.1}
            max={3}
            step={0.1}
            value={[contrast]}
            onValueChange={(value) => setContrast(value[0])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brightness-slider">
            Brightness: {brightness.toFixed(1)}
          </Label>
          <Slider
            id="brightness-slider"
            min={0.1}
            max={3}
            step={0.1}
            value={[brightness]}
            onValueChange={(value) => setBrightness(value[0])}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="invert-switch"
            checked={invert}
            onCheckedChange={setInvert}
          />
          <Label htmlFor="invert-switch">Invert Colors</Label>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Character Set</Label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCharSet}
              onChange={(e) =>
                setSelectedCharSet(e.target.value as AsciiSetName)
              }
            >
              {Object.entries(ASCII_CHAR_SETS).map(([key, chars]) => (
                <option key={key} value={key}>
                  {key} ({chars.join('')})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <Button onClick={generateAsciiArt} disabled={!imageFile}>
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
};

const Canvas = ({
  asciiArt,
  downloadAsPNG,
  canvasRef,
  outputCanvasRef,
}: {
  asciiArt: string;
  downloadAsPNG: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  outputCanvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(asciiArt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full max-h-screen">
      <div className="flex shrink-0 w-full flex-col items-end justify-center py-2 border-b px-4">
        <div className="flex flex-row items-center gap-2">
          <Button
            variant={'outline'}
            size="sm"
            onClick={copyToClipboard}
            disabled={!asciiArt}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant={'outline'}
            size="sm"
            onClick={downloadAsPNG}
            disabled={!asciiArt}
          >
            <Download className="h-4 w-4" />
            Download as PNG
          </Button>
        </div>
      </div>
      <div className="overflow-scroll w-full grow rounded-none">
        <pre
          className="select-all whitespace-pre p-4 font-mono text-gray-600 overflow-auto max-h-full"
          style={{
            fontSize: `${FONT_SIZE_PX}px`,
            lineHeight: `${LINE_HEIGHT}px`,
            letterSpacing: '0px',
            fontFamily: FONT_FAMILY,
          }}
        >
          {asciiArt}
        </pre>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={outputCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};
