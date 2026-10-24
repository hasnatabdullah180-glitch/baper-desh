import * as THREE from 'three'
import { useLayoutEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const BOX = new THREE.BoxGeometry(1, 1, 1)
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 14)
export const SPH = new THREE.SphereGeometry(1, 14, 10)
export const ICO = new THREE.IcosahedronGeometry(1, 1)
export const PLANE = new THREE.PlaneGeometry(1, 1)

const mats = new Map()
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o)
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...o }))
  return mats.get(key)
}

const FONT = '"Hind Siliguri","Noto Sans Bengali","Nirmala UI","Vrinda",sans-serif'
export const DISPLAY_FONT = '"Baloo Da 2","Hind Siliguri","Noto Sans Bengali","Nirmala UI",sans-serif'
const texCache = new Map()

function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache.set(key, t)
  return t
}

function fitText(g, text, maxW, size, weight = 700) {
  g.font = `${weight} ${size}px ${FONT}`
  while (g.measureText(text).width > maxW && size > 14) { size -= 3; g.font = `${weight} ${size}px ${FONT}` }
}

export function signTex(text, bg, fg) {
  return canvasTex(`s|${text}|${bg}|${fg}`, 512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16)
    fitText(g, text, w - 50, 70)
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 4)
  })
}

export function labelTex(text, color) {
  return canvasTex(`l|${text}|${color}`, 512, 128, (g, w, h) => {
    g.fillStyle = 'rgba(10,14,28,0.78)'
    g.beginPath(); g.roundRect(6, 14, w - 12, h - 28, 28); g.fill()
    g.strokeStyle = color; g.lineWidth = 6; g.stroke()
    fitText(g, text, w - 60, 66, 800)
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(text, w / 2, h / 2 + 3)
  })
}

export function flagTex() {
  return canvasTex('flag', 256, 160, (g, w, h) => {
    g.fillStyle = '#006a4e'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#f42a41'; g.beginPath(); g.arc(w * 0.45, h / 2, h * 0.3, 0, Math.PI * 2); g.fill()
  })
}

// window facade, tinted per colour
export function facadeTex(color) {
  return canvasTex('f|' + color, 64, 64, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 5, w, 5)
    g.fillStyle = Math.random() < 0.3 ? '#ffe9a8' : '#2d3d52'
    g.fillRect(14, 14, 36, 30)
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(14, 14, 36, 6)
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3; g.strokeRect(14, 14, 36, 30)
  })
}

export function Inst({ geo, mat: m, items, shadow = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current, d = new THREE.Object3D(), c = new THREE.Color()
    items.forEach((it, i) => {
      d.position.set(...it.p); d.scale.set(...(it.s || [1, 1, 1])); d.rotation.set(0, it.r || 0, 0); d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
      if (it.c) mesh.setColorAt(i, c.set(it.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[geo, m, items.length]} castShadow={shadow} receiveShadow frustumCulled={false} />
}

// merge simple parts into one vertex-coloured geometry (1 draw call)
export function mergeParts(parts) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color()
  const list = parts.map(({ g, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], c }) => {
    const geo = g.clone()
    geo.applyMatrix4(m.compose(pos.set(...p), q.setFromEuler(e.set(...r)), sc.set(...s)))
    col.set(c)
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return geo
  })
  return mergeGeometries(list)
}

// all shop signs in one atlas texture: rows of 128px
export function signAtlas(defs) {
  const N = defs.length
  return canvasTex('atlas|' + N, 512, 128 * N, (g, w) => {
    defs.forEach(([text, bg, fg], i) => {
      const y = i * 128
      g.fillStyle = bg; g.fillRect(0, y, w, 128)
      g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, y + 8, w - 16, 112)
      fitText(g, text, w - 50, 70)
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(text, w / 2, y + 68)
    })
  })
}
