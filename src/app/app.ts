/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, combineLatest, of, ReplaySubject, Subject, throttleTime } from "rxjs";

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
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector("canvas");

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
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [
			{
				view: undefined as unknown as GPUTextureView,
				loadOp: "clear",
				storeOp: "store",
				clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
			},
		];

		const entities: Entity[] = [
			{
				kind: "tri", verts: [
					0.0, 0.5,	// top
					-0.5, -0.5,	// bottom left
					0.5, -0.5	// bottom right
				]
			},
			{ kind: "quad", verts: createQuadVertices() }
		];

		const acc = entities.reduce((a, e) =>
			({ vertices: a.vertices.concat(e.verts) }),
			{ vertices: <number[]>[] }
		);

		const posStorageValues = new Float32Array(acc.vertices);
		const posStorageBuffer = device.createBuffer({
			label: `position storage buffer`,
			size: posStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(posStorageBuffer, 0, posStorageValues);

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: posStorageBuffer }, },
			],
		});

		// Render Loop.

		combineLatest({
			// frame: animationFrames(),
			frame: of(1),
			canvasDimension: canvasDimension$
		})
			// .pipe(throttleTime(100))
			.subscribe(({ frame, canvasDimension }) => {

			const renderPassDescriptor: GPURenderPassDescriptor = {
				label: "our basic canvas renderpass",
				colorAttachments: colorAttachments,
			};
			colorAttachments[0].view = context!?.getCurrentTexture().createView();

			const encoder = device.createCommandEncoder({ label: "our encoder" });
			const pass = encoder.beginRenderPass(renderPassDescriptor);
			pass.setPipeline(pipeline);

			// Assign here later for write buffer.

			// Assign resource
			pass.setBindGroup(0, bindGroup);
			// draw single pass. Not draw yet, Store it as a command.
			pass.draw(acc.vertices.length / 2); // vec2f for position.

			pass.end();
			const commandBuffer = encoder.finish();
			device.queue.submit([commandBuffer]);
		});
	}
}


type Dimension = { width: number, height: number}
type Coord = { x: number, y: number }
const transformToClipSpace = (dimension: Dimension) => (coord: Coord): [number, number] => {
	return [
		((coord.x / dimension.width) * 2 - 1),
		(1 - (coord.y / dimension.height) * 2)
	];
}
// const normMinMax = (min: number, max: number) => (value: number): number => {
// 	return max - value / (max - min);
// };
const rgbaToColor = (r: number, g: number, b: number, a: number = 1): [number, number, number, number] => {
	return [r / 255, g / 255, b / 255, a / 1];
};


// hard coded resolution.
const resWidth = 2400;
const resHeight = 970
const toCp = transformToClipSpace({ width: resWidth, height: resHeight });

function createQuadVertices(): number[] {
	const coords = <Coord[]>[
		// Triangle 1.
		{ x: 0, y: 0 }, // top left
		{ x: 0, y: 100 }, // bottom left
		{ x: 100, y: 100 }, // bottom right
		// Triangle 2.
		{ x: 0, y: 0 }, //  top left
		{ x: 100, y: 100 }, // bottom right
		{ x: 100, y: 0 }, // bottom right
	];
	const coordsCp = coords.map(toCp);
	return coordsCp.flatMap(x => x);
	// why not return simply an array.
}

type Entity = (
	| { kind: "tri" }
	| { kind: "quad" })
	// | { kind: "cool-hero" } // 🤣
& { verts: number[] }
