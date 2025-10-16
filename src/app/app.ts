/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, throttleTime } from "rxjs";


@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App implements AfterViewInit {
	constructor() {
	}
	async ngAfterViewInit(): Promise<void> {
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector('canvas');
		const context = canvas?.getContext('webgpu');
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context?.configure({
			device,
			format: presentationFormat
		});
		const shaderCode = await fetch('/assets/shaders/shader1.wgsl').then(r => r.text());
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode
		});
		const pipeline = device.createRenderPipeline({
			label: "our hardcoded red triangle pipeline",
			layout: 'auto',
			vertex: {
				entryPoint: 'vs',
				module,
			},
			fragment: {
				entryPoint: 'fs',
				module,
				targets: [{ format: presentationFormat }]
			}
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [{
			view: undefined as unknown as GPUTextureView,
			loadOp: 'clear',
			storeOp: 'store',
			clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
		}];


		// Uniform buffer.
		const uniformBufferSize = (
			4 * 4 + // color is 4 32bit floats (4bytes each)
			2 * 4 +// offset is 2 32bit floats (4bytes each)
			2 * 4 // padding
		);
		const itemNum = 20;
		const entities = Array(itemNum).fill(undefined);
		const data = entities
			.map((_, i) => {
				const pos = [
					Math.random() * 2 - 1,
					Math.random() * 2 - 1
				]; // clip space X and Y.
				const color = [Math.random(), Math.random(), Math.random(), 1];
				return {
					pos,
					color
				};
			}).map(obj => {

				const uniformBuffer = device.createBuffer({
					label: "color and offset uniform buffer",
					size: uniformBufferSize,
					usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				});
				const chunk = 4;
				const uniformValues = new Float32Array(uniformBufferSize / chunk);
				// offsets to the various uniform values in float32 indices
				const kColorOffset = 0;
				const kOffsetOffset = 4;
				uniformValues.set(obj.color, kColorOffset);
				uniformValues.set(obj.pos, kOffsetOffset);



				return {
					uniformValues,
					uniformBuffer,
				};
			});
		// Updates only once.
		data.forEach(({ uniformValues, uniformBuffer }) => {
			// Copy uniforms to queue.
			device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
		});

		function setNewScale(scale: [number, number]) {
			// Set new scale.
			const chunk = 4;
			const uniformBufferSize = 2 * 4;// scale is 2 32bit floats (4bytes each)
			const uniformValues = new Float32Array(uniformBufferSize / chunk);
			// offsets to the various uniform values in float32 indices
			const kScaleOffset = 0;
			uniformValues.set(scale, kScaleOffset);
			return uniformValues;
		}
		const data_scaleOnly = entities
			.map((_, i) => {
				const scale = [Math.random(), Math.random()] as [number, number];
				return scale;
			}).map((scale, i) => {

				const uniformBuffer = device.createBuffer({
					label: `scale only uniform buffer${i}`,
					size: uniformBufferSize,
					usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				});

				// Set inital scale value.
				const uniformValues = setNewScale(scale);

				return {
					uniformBuffer,
					uniformValues,
				};
			});


		const bindGroups = entities
			.map((_, i) => {
				const bindGroup = device.createBindGroup({
					label: `Our first bind group${i} (scale)`,
					layout: pipeline.getBindGroupLayout(0),
					entries: [
						{ binding: 0, resource: { buffer: data[i].uniformBuffer } },
						{ binding: 1, resource: { buffer: data_scaleOnly[i].uniformBuffer } },
					]
				});
				return bindGroup;
			});

		// Render Loop.

		animationFrames()
			.pipe(throttleTime(100))
			.subscribe(_ => {

				const renderPassDescriptor: GPURenderPassDescriptor = {
					label: "our basic canvas renderpass",
					colorAttachments: colorAttachments
				}
				colorAttachments[0].view =
					context!?.getCurrentTexture().createView();

				const encoder = device.createCommandEncoder({ label: "our encoder" });
				const pass = encoder.beginRenderPass(renderPassDescriptor);
				pass.setPipeline(pipeline);

				// Loop through entties and update and write buffer.
				entities.forEach((_, i) => {
					// Update buffer.
					const newScale = [Math.random(), Math.random()] as [number, number];
					const uniformValues = setNewScale(newScale);
					// Copy uniforms to queue.
					device.queue.writeBuffer(data_scaleOnly[i].uniformBuffer, 0, uniformValues);
					// Assign resource
					pass.setBindGroup(0, bindGroups[i]);
					// draw single pass. Not draw yet, Store it as a command.
					pass.draw(3);
				});

				pass.end();
				const commandBuffer = encoder.finish();
				device.queue.submit([commandBuffer]);
			});
	}
}
