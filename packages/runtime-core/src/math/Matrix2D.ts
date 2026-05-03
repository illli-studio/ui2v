import type { RuntimeTransform } from '../types';

export interface Matrix2DValue {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export const IDENTITY_MATRIX: Matrix2DValue = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

export function multiplyMatrix(parent: Matrix2DValue, child: Matrix2DValue): Matrix2DValue {
  return {
    a: parent.a * child.a + parent.c * child.b,
    b: parent.b * child.a + parent.d * child.b,
    c: parent.a * child.c + parent.c * child.d,
    d: parent.b * child.c + parent.d * child.d,
    e: parent.a * child.e + parent.c * child.f + parent.e,
    f: parent.b * child.e + parent.d * child.f + parent.f,
  };
}

export function transformPoint(matrix: Matrix2DValue, point: Point2D): Point2D {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function matrixFromTransform(transform: RuntimeTransform): Matrix2DValue {
  const rotation = degreesToRadians(transform.rotation);
  const skewX = degreesToRadians(transform.skewX);
  const skewY = degreesToRadians(transform.skewY);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let matrix = translate(transform.x, transform.y);

  if (transform.originX || transform.originY) {
    matrix = multiplyMatrix(matrix, translate(transform.originX, transform.originY));
  }

  matrix = multiplyMatrix(matrix, {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: 0,
    f: 0,
  });

  if (skewX || skewY) {
    matrix = multiplyMatrix(matrix, {
      a: 1,
      b: Math.tan(skewY),
      c: Math.tan(skewX),
      d: 1,
      e: 0,
      f: 0,
    });
  }

  matrix = multiplyMatrix(matrix, {
    a: transform.scaleX,
    b: 0,
    c: 0,
    d: transform.scaleY,
    e: 0,
    f: 0,
  });

  if (transform.originX || transform.originY) {
    matrix = multiplyMatrix(matrix, translate(-transform.originX, -transform.originY));
  }

  return matrix;
}

export function decomposeMatrix(matrix: Matrix2DValue): RuntimeTransform {
  const scaleX = Math.hypot(matrix.a, matrix.b);
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  const scaleY = scaleX === 0 ? Math.hypot(matrix.c, matrix.d) : determinant / scaleX;
  const rotation = Math.atan2(matrix.b, matrix.a);

  return {
    x: matrix.e,
    y: matrix.f,
    scaleX,
    scaleY,
    rotation: radiansToDegrees(rotation),
    skewX: 0,
    skewY: 0,
    originX: 0,
    originY: 0,
  };
}

function translate(x: number, y: number): Matrix2DValue {
  return {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: x,
    f: y,
  };
}

function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

