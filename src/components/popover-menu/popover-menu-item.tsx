import {A11yWrapper, OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h} from 'preact';
import {useState} from 'preact/hooks';
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
}

export const PopoverMenuItem = (props: PopoverMenuItemProps) => {
  const {item, index, setRef, onKeyUp, onKeyDown, onClick} = props;
  const {isDisabled, isSelected, items, testId, label} = item;
  const [isChildOpen, setIsChildOpen] = useState(false);

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

  const renderChildItems = () => {
    if (!items) {
      return null;
    }
    return (
      <div className={[styles.popoverComponent, styles.childItem].join(' ')} role="menu" aria-expanded={isChildOpen} id="popoverContent">
        {isChildOpen
          ? items.map((item, index) => (
              <PopoverMenuItem
                key={index}
                item={item}
                index={index}
                onKeyDown={() => {}}
                onKeyUp={() => {}}
                onClick={() => {
                  item.onClick?.();
                  onClick?.();
                  setIsChildOpen(false);
                }}
              />
            ))
          : null}
      </div>
    );
  };

  return (
    <A11yWrapper
      role="menuitem"
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
      }}>
      <div
        tabIndex={isDisabled ? -1 : 0}
        role="menuitem"
        className={`${styles.popoverMenuItem} ${isDisabled ? styles.popoverMenuItemDisabled : ''}`}
        data-testid={testId}
        ref={node => {
          setRef?.(index, node);
        }}>
        {label}
        {getAddonAfter()}
        {renderChildItems()}
      </div>
    </A11yWrapper>
  );
};
