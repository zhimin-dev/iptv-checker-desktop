import React, { useContext } from 'react'
import { MainContext } from './../../context/main';
import { SortableList } from "./sortable";

export default function sort(props) {
  const _mainContext = useContext(MainContext);
  return (
    <SortableList
      items={_mainContext.detailList}
      onChange={_mainContext.onChangeExportData}
      renderItem={(item) => (
        <SortableList.Item id={item.index}>
          {item.name}
          <SortableList.DragHandle />
        </SortableList.Item>
      )}
    />
  );
}