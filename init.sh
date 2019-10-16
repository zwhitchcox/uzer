echo "what is your library name?"
read -r PROJ_NAME
echo "what is your github username?"
read -r GITHUB_USERNAME

echo "creating project $PROJ_NAME"
git clone https://github.com/zwhitchcox/ts-lib $PROJ_NAME
cd $PROJ_NAME
sed -i -e 's/LIB_NAME/'$PROJ_NAME'/g' *
sed -i -e 's/GITHUB_USERNAME/'$GITHUB_USERNAME'/g' *
git remote rm origin
git remote add origin git@github.com:$GITHUB_USERNAME/$PROJ_NAME
rm init.sh
rm README.md
echo "# $PROJ_NAME" > README.md

echo
echo "project initialized successfully"