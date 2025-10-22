import {A11yWrapper, OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h} from 'preact';
import {useState, useRef} from 'preact/hooks';
import {Icon} from '@playkit-js/common/dist/icon';

import * as styles from './popover-menu.scss';

export interface PopoverMenuItemData {
  testId: string;
  label: string;
  onClick?: () => void;
  isDisabled?: boolean;
  isSelected?: boolean;
  items?: Array<PopoverMenuItemData>;
}

interface PopoverMenuItemProps {
  item: PopoverMenuItemData;
  index: number;
  setRef?: (index: number, ref: HTMLDivElement | null) => void;
  onKeyUp: (index: number) => void;
  onKeyDown: (index: number) => void;
  onClick?: () => void;
  onLeftKeyPressed?: () => void;
  onRightKeyPressed?: () => void;
  isChild?: boolean;
}

export const PopoverMenuItem = (props: PopoverMenuItemProps) => {
  const {item, index, setRef, onKeyUp, onKeyDown, onClick, isChild} = props;
  const {isDisabled, isSelected, items, testId, label} = item;
  const [isChildOpen, setIsChildOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const childRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const getAddonAfter = () => {
    if (items) {
      return <Icon name="chevronRight" />;
    }
    if (isSelected) {
      return <Icon name="check" />;
    }
    return null;
  };

  const handleOnClick = (event: OnClickEvent) => {
    if (isDisabled) {
      return;
    }
    if (items) {
      event.stopPropagation();
      setIsChildOpen(!isChildOpen);
      return;
    }
    onClick?.();
  };

  const focusChild = (i: number) => {
    const node = childRefs.current.get(i);
    node?.focus();
  };

  const handleChildUp = (currentIndex: number) => {
    if (!items?.length) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = items.length - 1;
    }

    while (items[prevIndex].isDisabled) {
      prevIndex = prevIndex - 1 < 0 ? items.length - 1 : prevIndex - 1;
    }

    focusChild(prevIndex);
  };

  const handleChildDown = (currentIndex: number) => {
    if (!items?.length) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      nextIndex = 0;
    }

    while (items[nextIndex].isDisabled) {
      nextIndex = nextIndex + 1 >= items.length ? 0 : nextIndex + 1;
    }

    focusChild(nextIndex);
  };

  const renderChildItems = () => {
    if (!items) {
      return null;
    }
    return (
      <div className={[styles.popoverComponent, styles.childItem].join(' ')} role="menu" aria-expanded={isChildOpen} id="popoverContent">
        {isChildOpen
          ? items.map((item, index) => (
              <PopoverMenuItem
                isChild={true}
                key={index}
                item={item}
                index={index}
                onKeyDown={() => handleChildDown(index)}
                onKeyUp={() => handleChildUp(index)}
                setRef={(i, node) => childRefs.current.set(i, node)}
                onClick={() => {
                  item.onClick?.();
                  onClick?.();
                  setIsChildOpen(false);
                }}
                onLeftKeyPressed={() => {
                  setIsChildOpen(false);
                  parentRef.current?.focus();
                }}
                onRightKeyPressed={() => {
                  setIsChildOpen(false);
                  parentRef.current?.focus();
    }}
              />
            ))
          : null}
      </div>
    );
  };

  return (
    <A11yWrapper
      role={isChild ? "menuitemradio" : "menuitem"}
      onClick={handleOnClick}
      onDownKeyPressed={() => {
        if (!isDisabled) {
          onKeyDown(index);
        }
      }}
      onUpKeyPressed={() => {
        if (!isDisabled) {
          onKeyUp(index);
        }
      }}
      onRightKeyPressed={() => {
        if (items && !isDisabled) {
          if (!isChildOpen) {
            setIsChildOpen(true);
          }
          childRefs.current.get(0)?.focus();
        } else {
            props.onRightKeyPressed?.();
        }
      }}
      onLeftKeyPressed={() => {
        if (isChildOpen) {
          childRefs.current.get(0)?.focus();
        } else {
          props.onRightKeyPressed?.();
        }
      }}
    >
      <div
        tabIndex={isDisabled ? -1 : 0}
        aria-checked={isSelected}
        className={`${styles.popoverMenuItem} ${isDisabled ? styles.popoverMenuItemDisabled : ''}`}
        data-testid={testId}
        ref={node => {
          parentRef.current = node;
          setRef?.(index, node);
        }}
      >
        {label}
        {getAddonAfter()}
        {renderChildItems()}
      </div>
    </A11yWrapper>
  );
};
