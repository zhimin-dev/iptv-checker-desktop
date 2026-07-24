import * as React from 'react';
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import Avatar from '@mui/material/Avatar';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import Checkbox from '@mui/material/Checkbox';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { AutoSizer, Column, Table } from 'react-virtualized';
import { styled } from '@mui/material/styles';
import { green, pink } from '@mui/material/colors';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import TagFacesIcon from '@mui/icons-material/TagFaces';

export const classes = {
    flexContainer: 'ReactVirtualizedDemo-flexContainer',
    tableRow: 'ReactVirtualizedDemo-tableRow',
    tableRowHover: 'ReactVirtualizedDemo-tableRowHover',
    tableCell: 'ReactVirtualizedDemo-tableCell',
    noClick: 'ReactVirtualizedDemo-noClick',
};

export const styles = ({ theme }) => ({
    // temporary right-to-left patch, waiting for
    // https://github.com/bvaughn/react-virtualized/issues/454
    '& .ReactVirtualized__Table__headerRow': {
        ...(theme.direction === 'rtl' && {
            paddingLeft: '0 !important',
        }),
        ...(theme.direction !== 'rtl' && {
            paddingRight: undefined,
        }),
    },
    [`& .${classes.flexContainer}`]: {
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
    },
    [`& .${classes.tableRow}`]: {
        cursor: 'pointer',
    },
    [`& .${classes.tableRowHover}`]: {
        '&:hover': {
            backgroundColor: theme.palette.grey[200],
        },
    },
    [`& .${classes.tableCell}`]: {
        flex: 1,
    },
    [`& .${classes.noClick}`]: {
        cursor: 'initial',
    },
});

class MuiVirtualizedTable extends React.PureComponent {
    static defaultProps = {
        headerHeight: 48,
        rowHeight: 80,
    };

    getRowClassName = ({ index }) => {
        const { onRowClick } = this.props;

        return clsx(classes.tableRow, classes.flexContainer, {
            [classes.tableRowHover]: index !== -1 && onRowClick != null,
        });
    };

    getObjectIndexIndex = (index) => {
        const { originalData } = this.props;
        for (let i = 0; i < originalData.length; i++) {
            if (originalData[i].index === index) {
                return i
            }
        }
        return 0
    }

    formatChannelName = (entry, displayMode) => {
        const name = entry.tvgName || entry.name || '';
        if (!displayMode || displayMode === 0) return name;
        const vt = entry.videoType;
        if (!vt) return name;
        if (displayMode === 1) {
            return name + ' ' + vt;
        } else if (displayMode === 2) {
            const numMap = { SD: '480p', HD: '720p', FHD: '1080p', UHD: '2160p', FUHD: '4320p' };
            return name + ' ' + (numMap[vt] || vt);
        }
        return name;
    }

    cellRenderer = ({ cellData, columnIndex }) => {
        const { t, rowHeight, onRowClick, showMultiSelect, selectRow, watchRow, originalData, columns, seeDetail, nowMod, channelNameDisplayMode } = this.props;
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, {
                    [classes.noClick]: onRowClick == null,
                })}
                variant="body"
                style={{
                    height: rowHeight,
                    width: columns[columnIndex].width + " !important",
                    flex: "auto"
                }}
            >
                {
                    columnIndex === 0 ? (
                        showMultiSelect ? (
                            <Checkbox
                                color="primary"
                                checked={originalData[this.getObjectIndexIndex(cellData)].checked}
                                onClick={() => selectRow(cellData)}
                                inputProps={{
                                    'aria-labelledby': columnIndex,
                                }}
                            />
                        ) : (
                            <></>
                        )
                    ) : ''
                }
                {
                    columnIndex === 1 ? (
                        <div>
                            <div style={{ fontWeight: '600', cursor: 'pointer' }}>
                                {cellData} - <span onClick={() => seeDetail(originalData[this.getObjectIndexIndex(cellData)])}>{this.formatChannelName(originalData[this.getObjectIndexIndex(cellData)], channelNameDisplayMode)}</span>
                                {
                                    nowMod === 1 ? (
                                        <IconButton size="small" onClick={() => watchRow(originalData[this.getObjectIndexIndex(cellData)])}>
                                            <LiveTvIcon fontSize="small" sx={{ color: green[400] }} />
                                        </IconButton>
                                    ) : ''
                                }
                            </div>
                            <div style={{ fontSize: '12px', color: '#7a7a7a', overflow: 'hidden', height: '16px' }}><i>{originalData[this.getObjectIndexIndex(cellData)].url}</i></div>
                            <div style={{ fontSize: '12px', color: '#7a7a7a' }}>{originalData[this.getObjectIndexIndex(cellData)].video ? "" + originalData[this.getObjectIndexIndex(cellData)].video.width + "x" + originalData[this.getObjectIndexIndex(cellData)].video.height + "-" + originalData[this.getObjectIndexIndex(cellData)].video.codec + "" : ''}{'-'}{originalData[this.getObjectIndexIndex(cellData)].audio ? "" + originalData[this.getObjectIndexIndex(cellData)].audio.codec + "-" + originalData[this.getObjectIndexIndex(cellData)].audio.channels + " audio channels" : ''}</div>
                        </div>
                    ) : ''
                }
                {
                    columnIndex === 2 ? (
                        <Box>
                            {
                                originalData[this.getObjectIndexIndex(cellData)].status === 0 ? (
                                    <Avatar sx={{ width: 24, height: 24 }}>
                                        <HorizontalRuleIcon />
                                    </Avatar>
                                ) : ''
                            }
                            {
                                originalData[this.getObjectIndexIndex(cellData)].status === 1 ? (
                                    nowMod === 0 ? (
                                        <div style={{
                                            color: originalData[this.getObjectIndexIndex(cellData)].delay < 500 ? 'green' : 'red',
                                            fontWeight: "bold",
                                        }}>{originalData[this.getObjectIndexIndex(cellData)].delay}ms</div>
                                    ) : (
                                        <Avatar sx={{ bgcolor: green[500], width: 24, height: 24 }}>
                                            <TagFacesIcon />
                                        </Avatar>
                                    )

                                ) : ''
                            }
                            {
                                originalData[this.getObjectIndexIndex(cellData)].status === 2 ? (
                                    <Avatar sx={{ bgcolor: pink[500], width: 24, height: 24 }}>
                                        <SentimentVeryDissatisfiedIcon />
                                    </Avatar>
                                ) : ''
                            }
                        </Box>
                    ) : ''
                }
            </TableCell>
        );
    };

    headerRenderer = ({ label, columnIndex }) => {
        const { selectedArr, originalData, showMultiSelect, selectAll, columns } = this.props;
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
                variant="head"
                style={{
                    width: columns[columnIndex].width + " !important",
                    flex: "auto",
                }}
            >
                {
                    columnIndex === 0 ? (
                        showMultiSelect ? (
                            <Checkbox
                                color="primary"
                                checked={selectedArr.length > 0 && selectedArr.length === originalData.length}
                                onClick={selectAll}
                                indeterminate={selectedArr.length > 0 && selectedArr.length !== originalData.length}
                                inputProps={{
                                    'aria-labelledby': -1,
                                }}
                            />
                        ) : (
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;</div>
                        )
                    ) : ''
                }
                {
                    columnIndex !== 0 ? (
                        <span>{label}</span>
                    ) : ''
                }
            </TableCell>
        );
    };

    render() {
        const { columns, rowHeight, headerHeight, ...tableProps } = this.props;
        return (
            <AutoSizer>
                {({ height, width }) => (
                    <Table
                        height={height}
                        width={width}
                        rowHeight={rowHeight}
                        gridStyle={{
                            direction: 'inherit',
                        }}
                        headerHeight={headerHeight}
                        {...tableProps}
                        rowClassName={this.getRowClassName}
                    >
                        {columns.map(({ dataKey, ...other }, index) => {
                            return (
                                <Column
                                    key={dataKey}
                                    headerRenderer={(headerProps) =>
                                        this.headerRenderer({
                                            ...headerProps,
                                            columnIndex: index,
                                        })
                                    }
                                    className={classes.flexContainer}
                                    cellRenderer={this.cellRenderer}
                                    dataKey={dataKey}
                                    {...other}
                                />
                            );
                        })}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

MuiVirtualizedTable.propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            dataKey: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            width: PropTypes.number.isRequired,
        }),
    ).isRequired,
    headerHeight: PropTypes.number,
    onRowClick: PropTypes.func,
    rowHeight: PropTypes.number,
};

export const VirtualizedTable = styled(MuiVirtualizedTable)(styles);