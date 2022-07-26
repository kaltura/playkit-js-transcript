import {cloneElement, VNode} from 'preact';

const {ENTER, SPACE} = KalturaPlayer.ui.utils.KeyMap;

export type OnClickEvent = KeyboardEvent | MouseEvent;
export type OnClick = (e: OnClickEvent, byKeyboard?: boolean) => void;

interface A11yWrapperProps {
  children: VNode;
  onClick: OnClick;
}

export const A11yWrapper = ({children, onClick}: A11yWrapperProps) => {
  return cloneElement(children, {
    onKeyDown: (e: KeyboardEvent) => {
      if ([SPACE, ENTER].includes(e.keyCode)) {
        e.preventDefault();
        onClick(e, true);
      }
    },
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      onClick(e);
    }
  });
};
