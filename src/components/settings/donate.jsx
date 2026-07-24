import React, { useContext, useState } from 'react';
import { MainContext } from '../../context/main';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Grid, Dialog, DialogTitle, DialogContent, Card, CardContent, CardActionArea } from '@mui/material';
import StarsIcon from '@mui/icons-material/Stars';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import _package from '../../../package.json';
import howtostarPng from '../../assets/howtostar.png';

const DonateSettings = () => {
    const { t } = useTranslation();
    const mainContext = useContext(MainContext);
    const sponsors = mainContext.configInfo.sponsor || [];
    
    const [step, setStep] = useState(0); // 0: Initial, 1: Choose Type, 2: Show Content
    const [rewardType, setRewardType] = useState(null); // 'money', 'star'
    const [selectedSponsor, setSelectedSponsor] = useState(null);

    const handleLike = () => {
        setStep(1);
    };

    const handleSelectReward = (type) => {
        setRewardType(type);
        setStep(2);
    };
    
    const handleGoBack = () => {
        setStep(1);
        setRewardType(null);
    }

    const handleSelectSponsor = (sponsor) => {
        setSelectedSponsor(sponsor);
    };

    const handleCloseDialog = () => {
        setSelectedSponsor(null);
    };
    
    const goToGithub = () => {
        window.open(_package.homepage_url, '_blank');
    };

    return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {step === 0 && (
                <>
                    <Typography variant="h5" gutterBottom>
                        {t('你觉得这个项目不错吗？')}
                    </Typography>
                    <Box sx={{ mt: 4 }}>
                        <Button variant="contained" color="primary" size="large" onClick={handleLike}>
                            {t('觉得不错！')}
                        </Button>
                    </Box>
                </>
            )}

            {step === 1 && (
                <>
                    <Typography variant="h5" gutterBottom>
                         {t('感谢您的认可！')}
                    </Typography>
                     <Typography variant="body1" sx={{ mb: 4 }}>
                        {t('请选择一种方式支持开发者')}
                    </Typography>
                    
                    <Grid container spacing={4} justifyContent="center">
                        <Grid item>
                            <Card sx={{ maxWidth: 345, minWidth: 200 }}>
                                <CardActionArea onClick={() => handleSelectReward('money')} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <LocalCafeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                    <CardContent>
                                        <Typography gutterBottom variant="h6" component="div">
                                            {t('金钱奖励')}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                        <Grid item>
                             <Card sx={{ maxWidth: 345, minWidth: 200 }}>
                                <CardActionArea onClick={() => handleSelectReward('star')} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <StarsIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
                                    <CardContent>
                                        <Typography gutterBottom variant="h6" component="div">
                                            {t('精神鼓励')}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}

            {step === 2 && rewardType === 'money' && (
                <>
                     <Typography variant="h5" gutterBottom>
                        {t('请选择捐赠方式')}
                    </Typography>
                    <Grid container spacing={2} justifyContent="center" sx={{ mb: 4, mt: 2 }}>
                        {sponsors.map((sponsor, index) => (
                            <Grid item key={index}>
                                <Button 
                                    variant="outlined" 
                                    size="large"
                                    onClick={() => handleSelectSponsor(sponsor)}
                                >
                                    {sponsor.name}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                     {sponsors.length === 0 && (
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                            {t('暂无捐赠信息')}
                        </Typography>
                    )}
                    <Button variant="text" onClick={handleGoBack}>
                        {t('返回')}
                    </Button>
                </>
            )}

             {step === 2 && rewardType === 'star' && (
                <>
                    <StarsIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                     <Typography variant="h5" gutterBottom>
                        {t('您的 Star 是我们最大的动力！')}
                    </Typography>
                    <Box sx={{ mt: 4, mb: 2 }}>
                         <Button variant="contained" color="primary" size="large" onClick={goToGithub}>
                            {t('前往 GitHub 点 Star')}
                        </Button>
                    </Box>
                    <img src={howtostarPng} alt="how to star" style={{ width: '100%', maxWidth: '800px', objectFit: 'contain' }} />
                    <Button variant="text" onClick={handleGoBack}>
                        {t('返回')}
                    </Button>
                </>
            )}

            <Dialog open={!!selectedSponsor} onClose={handleCloseDialog} maxWidth="md">
                <DialogTitle>{selectedSponsor?.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        {selectedSponsor?.url && (
                            <img 
                                src={selectedSponsor.url} 
                                alt={selectedSponsor.name} 
                                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} 
                            />
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default DonateSettings;
