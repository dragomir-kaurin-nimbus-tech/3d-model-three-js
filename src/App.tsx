import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

export default function Component() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const lightsRef = useRef<{
    directional: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
    point: THREE.PointLight;
  } | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTextureApplied, setIsTextureApplied] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb); // Sky blue background
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    lightsRef.current = {
      directional: directionalLight,
      ambient: ambientLight,
      point: pointLight,
    };

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Helper grid
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const importModel = () => {
    if (!sceneRef.current) return;

    const loader = new OBJLoader();
    loader.load(
      "/cottage_obj.obj",
      (obj) => {
        if (modelRef.current) {
          sceneRef.current?.remove(modelRef.current);
        }
        obj.position.set(0, 0, 0);
        obj.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
        sceneRef.current?.add(obj);
        modelRef.current = obj;
        setIsModelLoaded(true);

        // Center camera on the model
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current?.fov ?? 75;
        const cameraZ = Math.abs(
          maxDim / Math.sin(((fov / 2) * Math.PI) / 180)
        );
        cameraRef.current?.position.set(center.x, center.y, center.z + cameraZ);
        cameraRef.current?.lookAt(center);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("An error happened", error);
      }
    );
  };

  const applyTexture = () => {
    if (!modelRef.current) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "/cottage_normal.png",
      (texture) => {
        modelRef.current?.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.map = texture;
            child.material.needsUpdate = true;
          }
        });
        setIsTextureApplied(true);
      },
      undefined,
      (error) => {
        console.error("An error happened", error);
      }
    );
  };

  const toggleLightingMode = () => {
    if (!lightsRef.current) return;

    const newMode = !isDayMode;
    setIsDayMode(newMode);

    if (newMode) {
      // Day mode
      lightsRef.current.directional.intensity = 1;
      lightsRef.current.ambient.intensity = 0.5;
      lightsRef.current.point.intensity = 1;
      rendererRef.current?.setClearColor(0x87ceeb); // Sky blue
    } else {
      // Night mode
      lightsRef.current.directional.intensity = 0.2;
      lightsRef.current.ambient.intensity = 0.1;
      lightsRef.current.point.intensity = 0.5;
      rendererRef.current?.setClearColor(0x000033); // Dark blue
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div
        ref={mountRef}
        style={{ position: "absolute", inset: 0 }}
        aria-label="3D scene viewer"
      />
      <div
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 10 }}
      >
        <button
          onClick={importModel}
          disabled={isModelLoaded}
          style={{
            padding: "0.5rem 1rem",
            marginBottom: "0.5rem",
            backgroundColor: isModelLoaded ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isModelLoaded ? "not-allowed" : "pointer",
          }}
        >
          Import Model
        </button>
        <br />
        <button
          onClick={applyTexture}
          disabled={!isModelLoaded || isTextureApplied}
          style={{
            padding: "0.5rem 1rem",
            marginBottom: "0.5rem",
            backgroundColor:
              !isModelLoaded || isTextureApplied ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              !isModelLoaded || isTextureApplied ? "not-allowed" : "pointer",
          }}
        >
          Apply Texture
        </button>
        <br />
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            id="lighting-mode"
            checked={isDayMode}
            onChange={toggleLightingMode}
            style={{ marginRight: "0.5rem" }}
          />
          <label htmlFor="lighting-mode">
            {isDayMode ? "Day Mode" : "Night Mode"}
          </label>
        </div>
      </div>
    </div>
  );
}

//pogledaj da li su senke bile pre ovoga
// four
