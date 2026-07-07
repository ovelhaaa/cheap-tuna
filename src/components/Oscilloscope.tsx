import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

export function Oscilloscope({ started }: { started: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!started) return;
        
        let animationId: number;
        
        const draw = () => {
            const canvas = canvasRef.current;
            const analyser = audioEngine.getAnalyser();
            if (!canvas || !analyser) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgb(10, 10, 10)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ff8c1a'; // amber-primary equivalent
            ctx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [started]);

    return (
        <div className="module-panel p-2 rounded flex flex-col justify-center items-center bg-black min-h-[60px] sm:min-h-0 border border-amber-primary/20">
            <canvas ref={canvasRef} width="300" height="60" className="w-full h-[60px] opacity-80" />
        </div>
    );
}
