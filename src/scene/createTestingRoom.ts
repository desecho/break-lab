import * as THREE from "three";

export function createTestingRoom(scene: THREE.Scene): THREE.Group {
  scene.background = new THREE.Color(0x111719);
  scene.fog = new THREE.Fog(0x111719, 10, 21);
  const room = new THREE.Group();
  room.name = "testing-room";
  const concrete = new THREE.MeshStandardMaterial({ color: 0x323b3e, roughness: 0.92, metalness: 0.03 });
  const floorFinish = new THREE.MeshBasicMaterial({ color: 0x566162 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x252d30, roughness: 0.48, metalness: 0.68 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 10.2), floorFinish);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 2.05;
  floor.userData.room = true;
  room.add(floor);
  const wall = (position: [number, number, number], size: [number, number, number]): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), concrete);
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    mesh.userData.room = true;
    room.add(mesh);
  };
  wall([0, 2.5, -2.9], [11.5, 5, 0.2]);
  wall([0, 2.5, 7.05], [11.5, 5, 0.2]);
  wall([-5.7, 2.5, 2], [0.2, 5, 10]);
  wall([5.7, 2.5, 2], [0.2, 5, 10]);
  const catcher = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.8, 0.12), darkMetal);
  catcher.position.set(0, 2.15, -2.75);
  catcher.userData.room = true;
  room.add(catcher);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 1, 10), darkMetal);
  pedestal.position.y = 0.5;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  pedestal.userData.room = true;
  room.add(pedestal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.035, 8, 48), new THREE.MeshStandardMaterial({ color: 0xd89335, emissive: 0x8f4c12, emissiveIntensity: 1.2 }));
  ring.position.y = 1.02;
  ring.rotation.x = Math.PI / 2;
  room.add(ring);
  scene.add(room);
  return room;
}

export function createLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xd9eef2, 0x4b4037, 2.25));
  scene.add(new THREE.AmbientLight(0xb9c9ca, 0.72));
  const key = new THREE.SpotLight(0xffe4b8, 78, 13, Math.PI / 4.5, 0.55, 1.1);
  key.position.set(1.8, 5.2, 2.5);
  key.target.position.set(0, 0.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0xa5e6ed, 24, 10);
  fill.position.set(-3.4, 3.2, 2.2);
  scene.add(fill);
  const frontFill = new THREE.SpotLight(0xe6f2ef, 34, 11, Math.PI / 3.2, 0.8, 1.4);
  frontFill.position.set(0, 3.4, 5.4);
  frontFill.target.position.set(0, 1.2, 0);
  scene.add(frontFill, frontFill.target);
}
