import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { MainContextProvider } from './context/main'
import {
  RouterProvider,
  createHashRouter,
} from "react-router-dom";
import Menu from './components/layout/menu'
import './utils/i18n';
import { TaskProvider } from './context/tasker';
import { routes } from './router/routes';

const router = createHashRouter([
  {
    element: <Menu />,
    children: routes
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MainContextProvider>
      <TaskProvider>
        <RouterProvider router={router}/>
      </TaskProvider>
    </MainContextProvider>
  </React.StrictMode>
)
