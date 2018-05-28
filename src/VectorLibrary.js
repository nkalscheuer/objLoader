class VectorLibrary{
    constructor(){
        //Do nothing
    }

    
    static getVector(start, end){
        return new Vector3([
            (end.elements[0] - start.elements[0]),
            (end.elements[1] - start.elements[1]),
            (end.elements[2] - start.elements[2])
        ]);
    }

    static translatePoint(point, vector){
        var result = new Vector3();
        result.elements[0] = point.elements[0] + vector.elements[0];
        result.elements[1] = point.elements[1] + vector.elements[1];
        result.elements[2] = point.elements[2] + vector.elements[2];
        return result;
    }
    static translatePointArr(points, vector){
        // console.log("TranslateVector:");
        // console.log(vector.elements);
        var vectorArrCopy = [];
        for(var i = 0; i < points.length; i++){
            //console.log("Point");
            //console.log(points[i]);
            var translatedPoint = VectorLibrary.translatePoint(VectorLibrary.copyVector(points[i]), vector);
            //console.log("Translated Point");
            //console.log(translatedPoint);
            vectorArrCopy.push(translatedPoint);
        }
        //console.log("Translated point Arr:");
        VectorLibrary.printVectorArr(vectorArrCopy);
        return vectorArrCopy;
    }

    //Gets cross product of vector a and b
    //a and b are Vector3 s
    static crossProduct(a, b){
        var aVector = a.elements;
        var bVector = b.elements;

        //Calculate cross product for each vector
        var sx = aVector[1] * bVector[2] - aVector[2] * bVector[1];
        var sy = aVector[2] * bVector[0] - aVector[0] * bVector[2];
        var sz = aVector[0] * bVector[1] - aVector[1] * bVector[0];

        return new Vector3([sx, sy, sz]);
    }

    //Gets dot product of a an b 
    //a and b are Vector3 s
    static dotProduct(a, b){
        var aVector = a.elements;
        var bVector = b.elements;

        return (aVector[0] * bVector[0]) + (aVector[1] * bVector[1]) + (aVector[2] * bVector[2]);
    }
    static magnitude(a){
        let el = a.elements;
        return Math.sqrt(el[0]*el[0] + el[1]*el[1] + el[2]*el[2]);
    }

    static scaleVector(scalar, vector){
        var vectorArr = vector.elements;

        return new Vector3([(scalar * vectorArr[0]), (scalar * vectorArr[1]), (scalar * vectorArr[2] )]);
    }

    static copyVector(vector){
        var els = vector.elements;

        return new Vector3([els[0], els[1], els[2]]);
    }

    static copyVectorArr(vectorArr){
        var vectorArrCopy = [];
        for(var i = 0; i < vectorArr.length; i++){
            vectorArrCopy.push(VectorLibrary.copyVector(vectorArr[i]));
        }
        return vectorArrCopy;
    }
    static printVectorArr(vectorArr){
        for(var i = 0; i < vectorArr.length; i++){
            // console.log("Vector " + i);
            // console.log(vectorArr[i].elements);
        }
    }
}

