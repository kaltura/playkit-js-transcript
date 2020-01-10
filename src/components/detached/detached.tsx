import { h, Component } from "preact";

export interface DetachedProps {
    children: any;
    targetId: string;
}

export class Detached extends Component<DetachedProps> {
    render() {
        const { children, targetId } = this.props;
        return h((KalturaPlayer.ui as any).Portal, { into: targetId }, children);
    }
}
