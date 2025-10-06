/// <reference types="@webgpu/types" />

import { AfterViewInit, Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BehaviorSubject } from "rxjs";
// import shaderCode from '../assets/shaders/vertex.wgsl?raw';
import shaderCode from './vertex.wgsl?raw';


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
		const shaderCode = await fetch('assets/shaders/vertex.wgsl').then(r => r.text());
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode
		});
		console.log(adapter, device);
	}
}
