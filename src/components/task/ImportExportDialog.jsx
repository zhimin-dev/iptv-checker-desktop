import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import {
    Dialog,
    Box,
    TextField,
    Button,
} from '@mui/material';

export const ImportDialog = ({ onClose, open, onSave }) => {
    const { t } = useTranslation();
    const [body, setBody] = useState('');

    const handleClose = () => {
        setBody('');
        onClose(false);
    };

    const saveImport = () => {
        onSave(body);
    };

    const changeValue = (e) => {
        setBody(e.target.value);
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <Box sx={{ width: 500, padding: '20px' }}>
                <TextField
                    id="outlined-multiline-flexible"
                    multiline
                    value={body}
                    maxRows={4}
                    style={{ width: '500px' }}
                    onChange={changeValue}
                />
            </Box>
            <Button variant="text" onClick={saveImport}>{t('任务导入')}</Button>
        </Dialog>
    );
};

export const ExportDialog = ({ onClose, formValue, open }) => {
    const handleClose = () => {
        onClose(false);
    };

    return (
        <Dialog onClose={handleClose} open={open}>
            <Box sx={{ width: 500, padding: '20px' }}>
                <TextField
                    id="outlined-multiline-flexible"
                    multiline
                    value={formValue}
                    maxRows={4}
                    style={{ width: '500px' }}
                />
            </Box>
        </Dialog>
    );
}; 