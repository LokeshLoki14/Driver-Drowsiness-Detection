@echo off
if not exist models mkdir models
curl -L -o models\haarcascade_frontalface_default.xml https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml
curl -L -o models\lbfmodel.yaml https://raw.githubusercontent.com/kurnianggoro/GSOC2017/master/data/lbfmodel.yaml
dir models
echo.
echo haarcascade_frontalface_default.xml should be about 900 KB.
echo lbfmodel.yaml should be about 54 MB.
pause
