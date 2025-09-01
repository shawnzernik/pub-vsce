import * as React from "react";
import { Conversation as ConversationDto } from "@lvt/aici-library/dist/llm/Conversation";
import { Message } from "./Message";
import { Message as MessageDto } from "@lvt/aici-library/dist/llm/Message";
import { ChatRendering } from "./ChatWebview";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";

export interface Properties {
	model: ConversationDto;
	onChange: (convo: ConversationDto) => void;
	onSend: (convo: ConversationDto) => void;
	onUserMessageSelected: (index: number, content: string) => void;
	onSaveSnippet: (text: string, filename: string) => void;
	format: ChatRendering;
}

export class Conversation extends React.PureComponent<Properties> {
	private containerRef: React.RefObject<HTMLDivElement | null> = React.createRef<HTMLDivElement>();

	public constructor(props: Properties) {
		super(props);
	}

	private isNearBottom(): boolean {
		const el = this.containerRef.current;
		if (!el)
			return true;
		const threshold = 32;
		return el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
	}

	private scrollToBottom(): void {
		const el = this.containerRef.current;
		if (!el)
			return;
		el.scrollTop = el.scrollHeight;
	}

	public override componentDidMount(): void {
		this.scrollToBottom();
	}

	public override getSnapshotBeforeUpdate(): boolean {
		return this.isNearBottom();
	}

	public override componentDidUpdate(_prevProps: Properties, _prevState: unknown, wasAtBottom: boolean): void {
		if (wasAtBottom)
			this.scrollToBottom();
	}

	public override render(): React.ReactNode {
		const msgs = this.props.model.messages ?? [];

		return (
			<div
				ref={this.containerRef}
				style={{
					display: "flex",
					flexDirection: "column",
					flex: "1 1 0",
					overflow: "auto",
					minHeight: "0",
				}}
			>
				{msgs.map((msg: MessageDto, index: number) => (
					<Message
						key={index}
						format={this.props.format}
						model={msg}
						onChange={(newMsg: MessageDto) => {
							const newConvo = JsonHelper.copy<ConversationDto>(this.props.model);
							const nextMsgs = [...(newConvo.messages ?? [])];
							nextMsgs[index] = newMsg;
							newConvo.messages = nextMsgs;
							this.props.onChange(newConvo);
						}}
						onSend={() => {
							const base = this.props.model.messages ?? [];
							const slicedMsgs: MessageDto[] = base.slice(0, index);
							const newConvo: ConversationDto = {
								dated: this.props.model.dated,
								title: this.props.model.title,
								messages: slicedMsgs,
							};
							this.props.onSend(newConvo);
						}}
						onActivate={
							msg.role === "user"
								? () => this.props.onUserMessageSelected(index, msg.content || "")
								: undefined
						}
						onSaveSnippet={this.props.onSaveSnippet}
					/>
				))}
			</div>
		);
	}
}
