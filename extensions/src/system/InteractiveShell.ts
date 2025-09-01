import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { StringBuffer } from "@lvt/aici-library/dist/StringBuffer";

/**
 * InteractiveShell - lightweight wrapper around a spawned child process that
 * provides simple buffered reading and writing for interactive flows.
 *
 * Public API is intentionally small and stable for callers that need to drive
 * interactive commands programmatically.
 */
export class InteractiveShell {
	private process: ChildProcessWithoutNullStreams;
	private buffer: StringBuffer;
	private error = false;

	private constructor(process: ChildProcessWithoutNullStreams) {
		this.buffer = new StringBuffer();

		this.process = process;
		this.process.stdout.on("data", (data) => {
			this.buffer.append(data.toString());
		});
		this.process.stderr.on("data", (data) => {
			this.buffer.append(data.toString());
			this.error = true;
		});
	}

	/**
	 * Spawn and wrap a shell command for interactive usage.
	 */
	public static execute(command: string): InteractiveShell {
		const process = spawn(command, { shell: true });
		return new InteractiveShell(process);
	}

	/**
	 * True while the child process has not yet exited.
	 */
	public isRunning(): boolean {
		return this.process.exitCode === null;
	}

	public isError(): boolean {
		return this.error;
	}

	public resetError(): void {
		this.error = false;
	}

	/**
	 * Write to the process stdin.
	 * Returns true if the data was flushed to the kernel buffer, false otherwise.
	 * Protects against writing to a closed stdin.
	 */
	public write(data: string): boolean {
		try {
			// If stdin is closed or not writable, writing will either throw or return false.
			if (!this.process || !this.process.stdin || (this.process.stdin.writable === false))
				return false;
			return this.process.stdin.write(data);
		} catch {
			return false;
		}
	}

	/**
	 * Read and clear the internal buffer.
	 */
	public read(): string {
		const ret = this.buffer.toString();
		this.buffer.clear();
		return ret;
	}

	public static async sleep(seconds: number): Promise<void> {
		return new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
	}

}
