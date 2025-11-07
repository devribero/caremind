'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function Camera({ onCapture, onClose }: CameraProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Solicitar permissão e iniciar a câmera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
        setHasPermission(true);
      } catch (err) {
        console.error('Erro ao acessar a câmera:', err);
        setHasPermission(false);
      }
    };

    startCamera();

    // Limpar ao desmontar
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Ajustar o tamanho do canvas para o tamanho do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Desenhar o frame atual do vídeo no canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converter para base64
        const imageData = canvas.toDataURL('image/jpeg');
        setImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setImage(null);
  };

  const confirmPhoto = () => {
    if (image) {
      onCapture(image);
      onClose();
    }
  };

  // Parar a câmera ao fechar o modal
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  if (hasPermission === null) {
    return <div>Carregando câmera...</div>;
  }

  if (hasPermission === false) {
    return (
      <div className="camera-error">
        <p>Não foi possível acessar a câmera. Por favor, verifique as permissões.</p>
        <button onClick={onClose}>Fechar</button>
      </div>
    );
  }

  return (
    <div className="camera-container">
      <style jsx>{`
        .camera-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
        }
        .camera-preview {
          width: 100%;
          max-width: 500px;
          height: 400px;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }
        .camera-preview video,
        .camera-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .camera-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .capture-button {
          background-color: #4CAF50;
          color: white;
        }
        .retake-button {
          background-color: #f44336;
          color: white;
        }
        .confirm-button {
          background-color: #2196F3;
          color: white;
        }
        .close-button {
          background-color: #9e9e9e;
          color: white;
        }
        canvas {
          display: none;
        }
      `}</style>
      
      <div className="camera-preview">
        {!image ? (
          <video ref={videoRef} autoPlay playsInline />
        ) : (
          <img src={image} alt="Capturada" />
        )}
      </div>
      
      <div className="camera-buttons">
        {!image ? (
          <>
            <button className="capture-button" onClick={captureImage}>
              Tirar Foto
            </button>
            <button className="close-button" onClick={handleClose}>
              Fechar
            </button>
          </>
        ) : (
          <>
            <button className="retake-button" onClick={retakePhoto}>
              Tirar Outra
            </button>
            <button className="confirm-button" onClick={confirmPhoto}>
              Usar Foto
            </button>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} />
    </div>
  );
}
