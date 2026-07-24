import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {t('欢迎使用 iptv-checker')}
            </Typography>
            <Typography variant="subtitle1" gutterBottom color="textSecondary">
                {t('这是一个用于管理和检测 IPTV 频道的 Web 应用程序。')}
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                {t('定时检查任务')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                {t('配置定时任务，自动检测频道有效性。')}
                            </Typography>
                            <Button variant="outlined" onClick={() => navigate('/task')}>
                                {t('前往任务')}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                {t('想看的频道')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                {t('管理您喜欢的频道，并查看爬取结果。')}
                            </Typography>
                            <Button variant="outlined" onClick={() => navigate('/favorite')}>
                                {t('前往收藏')}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="div" gutterBottom>
                                {t('设置')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                {t('配置爬虫源、关键词替换和其他系统设置。')}
                            </Typography>
                            <Button variant="outlined" onClick={() => navigate('/settings')}>
                                {t('前往设置')}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Welcome;

