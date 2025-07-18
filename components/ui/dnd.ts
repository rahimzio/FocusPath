// react-beautiful-dnd.d.ts

declare module 'react-beautiful-dnd' {
    import { HTMLAttributes, Ref, ReactNode, ComponentType } from 'react';
  
    export interface ProvidedProps {
      innerRef: Ref<any>;
      draggableProps: HTMLAttributes<HTMLDivElement>;
      dragHandleProps: HTMLAttributes<HTMLDivElement>;
      placeholder: ReactNode;
    }
  
    export const DragDropContext: ComponentType<any>;
    export const Droppable: ComponentType<any>;
    export const Draggable: ComponentType<any>;
    // You can add more exports here as necessary
  }
  