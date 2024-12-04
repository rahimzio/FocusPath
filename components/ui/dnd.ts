// react-beautiful-dnd.d.ts

declare module 'react-beautiful-dnd' {
    import { DraggedProps } from 'react';
  
    export interface ProvidedProps {
      innerRef: React.Ref<any>;
      draggableProps: DraggedProps;
      dragHandleProps: DraggedProps;
      placeholder: React.ReactNode;
    }
  
    export const DragDropContext: React.ComponentType<any>;
    export const Droppable: React.ComponentType<any>;
    export const Draggable: React.ComponentType<any>;
    // You can add more exports here as necessary
  }
  