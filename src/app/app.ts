/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, combineLatest, EMPTY, fromEvent, map, of, ReplaySubject, scan, startWith, Subject, switchMap, tap, throttleTime } from "rxjs";
import * as m4 from "@thi.ng/matrices";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
	constructor(private ngZone: NgZone) {}
	async ngAfterViewInit(): Promise<void> {

		const m0 = [
			-0.5, -0.5, 0.5, 1.0,   // bottom-left
			0.5, -0.5, 0.5, 1.0,   // bottom-right
			0.5, 0.5, 0.5, 1.0,   // top-right
			-0.5, -0.5, 0.5, 1.0,   // bottom-left
			0.5, 0.5, 0.5, 1.0,   // top-right
			-0.5, 0.5, 0.5, 1.0,   // top-left
		];
		const m1 = Object.freeze(m4.IDENT44);
		const translated = m4.translation44(m0, [0.1, 0.1, 0.1]);
		console.log(translated)

		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector("canvas");

		const startingCamera = [1, 1, 1, 1];
		const camera$ = fromEvent<KeyboardEvent>(document!, 'keydown')
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					switch (event.key) {
						case "ArrowLeft": {
							return of([0.1, 0, 0]);
						}
						case "ArrowRight": {
							return of([-0.1, 0, 0]);
						}
						case "ArrowUp": {
							return of([0, 0.1, 0]);
						}
						case "ArrowDown": {
							return of([0, -0.1, 0]);
						}
						case "PageUp": {
							return of([0, 0, 0.1]);
						}
						case "PageDown": {
							return of([0, 0, -0.1]);
						}
						default:
							return EMPTY;
					}
				}),
				scan((acc, arr) => {
					return [
						Math.min(Math.max(acc[0] + arr[0], -1), 1),
						Math.min(Math.max(acc[1] + arr[1], -1), 1),
						Math.min(Math.max(acc[2] + arr[2], 0.1), 100),
						1
					];
				}, startingCamera),
				startWith(startingCamera),
			);

		const canvasDimension$ = new ReplaySubject<{ width: number, height: number }>(1);
		this.ngZone.runOutsideAngular(async () => {
			const observer = new ResizeObserver(entries => {
				for (const entry of entries) {
					const width = entry.contentBoxSize[0].inlineSize;
					const height = entry.contentBoxSize[0].blockSize;
					const canvas = entry.target as any;
					const newWidth = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
					const newHeight = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
					canvas.width = newWidth;
					canvas.height = newHeight;
					canvasDimension$.next({ width: newWidth, height: newHeight });
				}
			});
			observer.observe(canvas!);
		});

		const context = canvas?.getContext("webgpu");
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context?.configure({
			device,
			format: presentationFormat,
		});
		const shaderCode = await fetch("/assets/shaders/shader1.wgsl").then(
			(r) => r.text(),
		);
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode,
		});
		const pipeline = device.createRenderPipeline({
			label: "our hardcoded red triangle pipeline",
			layout: "auto",
			vertex: {
				entryPoint: "vs",
				module,
			},
			fragment: {
				entryPoint: "fs",
				module,
				targets: [{ format: presentationFormat }],
			},
			depthStencil: {
				format: "depth24plus",
				depthWriteEnabled: true,
				depthCompare: "less",
			}
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [
			{
				view: undefined as unknown as GPUTextureView,
				loadOp: "clear",
				storeOp: "store",
				clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
			},
		];

		const sceneGraph: Tree<Vertex> = createNode(
			unitCube("base"),
			[createLeaf(unitCube("left")), createLeaf(unitCube("right"))]
		);
		// head w/ two ears model, box composition.
		const m1Sg = mapTree<Vertex, Vertex>(sceneGraph, (cube) => {
			if (cube.id === "left" || cube.id === "right") {
				const gap = 0.0; // tiny gap to avoid cop[lanar z issues.
				const step = 1.0 + gap; // center to center spacing.
				return <Vertex>{
					...cube,
					vertices: cube.vertices,
					translates: cube.translates.map(([x, y, z, w], i) => {
						return [
							cube.id === "left" ? x + step : x - step,
							1,
							0.0,
							w,
						];
					}),
				};
			}
			return cube;
		});
		const foldedSceneGraph = reduceTree(
			m1Sg,
			(acc, val) => {
				return {
					verticesArray: [...acc.verticesArray, ...val.vertices],
					colorsArray: [...acc.colorsArray, ...val.colors],
					translatesArray: [...acc.translatesArray, ...val.translates],
					cubeCount: acc.cubeCount + 1
				};
			},
			{
				verticesArray: [] as number[],
				colorsArray: [] as number[],
				translatesArray: [] as number[][],
				cubeCount: 0
			}
		);

		const numOfVertices = 3; // Triangle primitive
		const cubeFaces = 6;
		const trianglePerFace = 2;
		const unitCubeNumOfVertices = numOfVertices * cubeFaces * trianglePerFace;

		const posStorageValues = new Float32Array(foldedSceneGraph.verticesArray);
		const posStorageBuffer = device.createBuffer({
			label: `Position storage buffer`,
			size: posStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(posStorageBuffer, 0, posStorageValues);

		const transStorageValues = new Float32Array(foldedSceneGraph.translatesArray.flat());
		const transStorageBuffer = device.createBuffer({
			label: `Translation storage buffer`,
			size: transStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const colorStorageValues = new Float32Array(foldedSceneGraph.colorsArray);
		const colorStorageBuffer = device.createBuffer({
			label: `Color storage buffer`,
			size: colorStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const cameraUniformBuffer = device.createBuffer({
			size: 4 * 4, // 4 floats, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const aspectUniformBuffer = device.createBuffer({
			size: 4 * 4, // 4 floats, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const timeUniformBuffer = device.createBuffer({
			size: 1 * 4, // 1 float, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: posStorageBuffer }, },
				{ binding: 1, resource: { buffer: colorStorageBuffer }, },
				{ binding: 2, resource: { buffer: transStorageBuffer }, },
				{ binding: 3, resource: { buffer: cameraUniformBuffer }, },
				{ binding: 4, resource: { buffer: aspectUniformBuffer }, },
				{ binding: 5, resource: { buffer: timeUniformBuffer }, },
			],
		});

		// Render Loop.

		combineLatest({
			frame: animationFrames(),
			// frame: of({ timestamp: 0 }),
			canvasDimension: canvasDimension$,
			camera: camera$,
		})
			.subscribe(({ frame, canvasDimension, camera }) => {

				// console.log(camera);

				const duration = 3_000;
				const period = (frame.timestamp % duration) / duration;

				const width = canvasDimension.width;
				const height = canvasDimension.height;
				const depthTexture = device.createTexture({
					size: [canvasDimension.width, canvasDimension.height],
					format: "depth24plus",
					usage: GPUTextureUsage.RENDER_ATTACHMENT,
				});
				const renderPassDescriptor: GPURenderPassDescriptor = {
					label: "our basic canvas renderpass",
					colorAttachments: colorAttachments,
					depthStencilAttachment: {
						view: depthTexture.createView(),
						depthClearValue: 1.0,
						depthLoadOp: "clear",
						depthStoreOp: "store"
					}
				};

				colorAttachments[0].view = context!?.getCurrentTexture().createView();

				const encoder = device.createCommandEncoder({ label: "our encoder" });
				const pass = encoder.beginRenderPass(renderPassDescriptor);
				pass.setPipeline(pipeline);

				// Assign here later for write buffer.
				device.queue.writeBuffer(colorStorageBuffer, 0, new Float32Array(foldedSceneGraph.colorsArray));

				// Assign here later for write buffer.
				device.queue.writeBuffer(transStorageBuffer, 0, transStorageValues);

				// Assign here later for write buffer.
				device.queue.writeBuffer(cameraUniformBuffer, 0, new Float32Array(camera));

				// Assign here later for write buffer.
				device.queue.writeBuffer(aspectUniformBuffer, 0, new Float32Array([width, height]));

				// Assign here later for write buffer.
				device.queue.writeBuffer(timeUniformBuffer, 0, new Float32Array([period]));

				// Assign resource
				pass.setBindGroup(0, bindGroup);

				const drawInstances = 1; // Note. Doesn't have to do with the vertices.
				pass.draw(foldedSceneGraph.cubeCount * unitCubeNumOfVertices, drawInstances);

				pass.end();
				const commandBuffer = encoder.finish();
				device.queue.submit([commandBuffer]);
			});
	}
}


type Dimension = { width: number, height: number}
type Coord = { x: number, y: number, z: number, w: number }
const transformToClipSpace = (dimension: Dimension) => (coord: Coord): [number, number, number, number] => {
	return [
		((coord.x / dimension.width) * 2 - 1),
		(1 - (coord.y / dimension.height) * 2),
		coord.z,
		coord.w
	];
}
// const normMinMax = (min: number, max: number) => (value: number): number => {
// 	return max - value / (max - min);
// };
const rgbaToColor = (r: number, g: number, b: number, a: number = 1): number[] => {
	return [r / 255, g / 255, b / 255, a / 1];
};


// hard coded resolution.
const resWidth = 2400;
const resHeight = 970
const toCp = transformToClipSpace({ width: resWidth, height: resHeight });

type Vertex = {
	id: string,
	vertices: number[],
	colors: number[],
	translates: number[][],
}
function unitCube(id: string): Vertex {
	const vertices = [
		// FRONT face (z = +0.5)
		-0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, -0.5, 0.5, 1.0,   // bottom-right
		0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, 0.5, 0.5, 1.0,   // top-left

		// BACK face (z = -0.5)
		0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, -0.5, 1.0,   // bottom-right
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, -0.5, 1.0,   // top-left

		// LEFT face (x = -0.5)
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, 0.5, 1.0,   // bottom-right
		-0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, 0.5, -0.5, 1.0,   // top-left

		// RIGHT face (x = +0.5)
		0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, -0.5, -0.5, 1.0,   // bottom-right
		0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, 0.5, 1.0,   // top-left

		// TOP face (y = +0.5)
		-0.5, 0.5, 0.5, 1.0,  // bottom-left
		0.5, 0.5, 0.5, 1.0,   // bottom-right
		0.5, 0.5, -0.5, 1.0,   // top-right
		-0.5, 0.5, 0.5, 1.0,   // bottom-left
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, -0.5, 1.0,   // top-left

		// BOTTOM face (y = -0.5)
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		0.5, -0.5, 0.5, 1.0,   // bottom-right
		0.5, -0.5, -0.5, 1.0,   // top-right
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, 0.5, 1.0,   // top-right
		0.5, -0.5, 0.5, 1.0,   // top-left
	];

	const colors: number[] = [
		// FRONT face - orange
		...Array(6).fill(rgbaToColor(243, 156, 18)).flat(),

		// BACK face - violet (wisteria)
		...Array(6).fill(rgbaToColor(142, 68, 173)).flat(),

		// LEFT face - green (gree sea)
		...Array(6).fill(rgbaToColor(22, 160, 133)).flat(),

		// RIGHT face - blue (belize hole)
		...Array(6).fill(rgbaToColor(41, 128, 185)).flat(),

		// TOP face - yellow (sunflower)
		...Array(6).fill(rgbaToColor(241, 196, 15)).flat(),

		// BOTTOM face - red (pomegranate)
		...Array(6).fill(rgbaToColor(192, 57, 43)).flat(),
	];

	// const translates: number[][] = [
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// 	...Array(6).fill([0, 0, 0, 1.0]),
	// ];

	// 6 faces, 6 vertices per face.
	const translates: number[][] = Array.from({ length: 36 }, () => [0, 0, 0, 1.0]);

	return {
		id,
		vertices,
		colors,
		translates,
	};
}

type Entity = (
	| { kind: "tri" }
	| { kind: "quad" }
	| { kind: "free" })
	// | { kind: "cool-hero" } // 🤣
& { verts: number[], triangleCount: number, color: number[] }

type Tree<T>
	= { kind: "leaf", value: T }
	| { kind: "node", value: T, children: Tree<T>[] }

// constructors
function createLeaf<T>(value: T): Tree<T> {
	return { kind: "leaf", value };
}

function createNode<T>(value: T, children: Tree<T>[]): Tree<T> {
	return { kind: "node", value, children };
}

function mapTree<T, U>(tree: Tree<T>, f: (value: T) => U): Tree<U> {
	if (tree.kind === "leaf") {
		return createLeaf(f(tree.value));
	}
	return createNode(f(tree.value), tree.children.map(child => mapTree(child, f)));
}

function reduceTree<T, R>(
	tree: Tree<T>,
	reducer: (acc: R, value: T) => R,
	initial: R
): R {
	const accHere = reducer(initial, tree.value);
	return tree.kind === "node"
		? tree.children.reduce(
			(acc, child) => reduceTree(child, reducer, acc),
			accHere
		)
		: accHere;
}
