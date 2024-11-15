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
  const controlsRef = useRef<OrbitControls | null>(null);
  const lightsRef = useRef<{
    directional: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
    point: THREE.PointLight;
  } | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTextureApplied, setIsTextureApplied] = useState(false);
  const [isDayMode, setIsDayMode] = useState(true);
  const [bookmarks, setBookmarks] = useState<
    { name: string; position: THREE.Vector3; target: THREE.Vector3 }[]
  >([]);
  const [isHovered, setIsHovered] = useState(false);

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
    controlsRef.current = controls;

    // Helper grid
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Raycaster for hover effect
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (modelRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(modelRef.current, true);
        setIsHovered(intersects.length > 0);
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    // Animation
    let lastTime = 0;
    const animate = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      requestAnimationFrame(animate);
      controls.update();

      if (modelRef.current) {
        // Continuous rotation
        modelRef.current.rotation.y += 0.0001 * deltaTime;

        // Hover effect
        const targetScale = isHovered ? 1.0001 : 1;
        modelRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.01
        );
      }

      renderer.render(scene, camera);
    };
    animate(0);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const importModel = (file: File) => {
    if (!sceneRef.current) return;

    const loader = new OBJLoader();
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        loader.load(
          event.target.result as string,
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
            cameraRef.current?.position.set(
              center.x,
              center.y,
              center.z + cameraZ
            );
            cameraRef.current?.lookAt(center);
          },
          (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
          },
          (error) => {
            console.error("An error happened", error);
          }
        );
      }
    };

    reader.readAsDataURL(file);
  };

  const applyTexture = (file: File) => {
    if (!modelRef.current) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          event.target.result as string,
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
      }
    };

    reader.readAsDataURL(file);
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

  const saveCameraPosition = () => {
    if (cameraRef.current && controlsRef.current) {
      const newBookmark = {
        name: `Bookmark ${bookmarks.length + 1}`,
        position: cameraRef.current.position.clone(),
        target: controlsRef.current.target.clone(),
      };
      setBookmarks([...bookmarks, newBookmark]);
    }
  };

  const loadBookmark = (bookmark: {
    position: THREE.Vector3;
    target: THREE.Vector3;
  }) => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.copy(bookmark.position);
      controlsRef.current.target.copy(bookmark.target);
      controlsRef.current.update();
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
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          zIndex: 10,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "1rem",
          borderRadius: "0.5rem",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="model-upload"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Upload Model (OBJ)
          </label>
          <input
            id="model-upload"
            type="file"
            accept=".obj"
            onChange={(e) => e.target.files && importModel(e.target.files[0])}
            style={{ display: "block", width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label
            htmlFor="texture-upload"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Upload Texture
          </label>
          <input
            id="texture-upload"
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && applyTexture(e.target.files[0])}
            disabled={!isModelLoaded}
            style={{ display: "block", width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!isDayMode}
              onChange={toggleLightingMode}
              style={{ marginRight: "0.5rem" }}
            />
            {"Night Mode"}
          </label>
        </div>
        <button
          onClick={saveCameraPosition}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
        >
          Save Camera Position
        </button>
      </div>
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "1rem",
          borderRadius: "0.5rem",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          width: "16rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
          }}
        >
          Bookmarks
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {bookmarks.map((bookmark, index) => (
            <li key={index} style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => loadBookmark(bookmark)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: "0.25rem",
                  cursor: "pointer",
                }}
              >
                {bookmark.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
