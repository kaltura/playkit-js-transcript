import { h, Component } from "preact";

export interface SearchProps {
    children: any;
    targetId: string;
}

export class External extends Component<SearchProps> {
    render() {
        const { children, targetId } = this.props;
        return h((KalturaPlayer.ui as any).Portal, { into: targetId }, children);
    }
}
