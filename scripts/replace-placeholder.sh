FROM=$1
TO=$2

if [ "${FROM}" = "${TO}" ]; then
    echo "Nothing to replace, the value is already set to ${TO}."
    exit 0
fi

echo "Replacing all statically built instances of $FROM with $TO."

# paperrocket-book: the standalone server keeps the built Next config in apps/web/server.js, so it is swapped too.
TARGETS="apps/web/.next/ apps/web/public/"
if [ -f apps/web/server.js ]; then
    TARGETS="$TARGETS apps/web/server.js"
fi

for file in $(egrep -r -l "${FROM}" $TARGETS); do
    sed -i -e "s|$FROM|$TO|g" "$file"
done
