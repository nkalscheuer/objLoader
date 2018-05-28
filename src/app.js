var VSHADER_SOURCE = `
#ifdef GL_ES
  precision mediump float;
  #endif
attribute float a_PointSize;
attribute vec4 a_Color;
varying vec4 v_Color;
attribute vec4 a_Normal;
varying vec3 v_Normal;
attribute vec4 a_Position;
varying vec4 v_Position;
uniform mat4 u_MvpMatrix;
uniform mat4 u_NormalMatrix;
uniform vec3 u_DiffuseColor;
uniform vec3 u_LightPosition;
uniform vec3 u_AmbientLight;
uniform vec3 u_SpecularColor;
uniform float u_Shader;
void main() {
  //Shared changes
  gl_Position = u_MvpMatrix * a_Position;
  gl_PointSize = a_PointSize;
  v_Normal = vec3(a_Normal);
  v_Position = u_MvpMatrix * a_Position;
  
  //Goraud shading
  if(u_Shader == 0.0){
    vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));  
    vec3 lightDirection = normalize((lightPosition) - vec3(v_Position));
    float nDotL = max(dot(lightDirection, v_Normal), 0.0);
    vec3 diffuse = u_DiffuseColor * a_Color.rgb * nDotL;
    vec3 ambient = u_AmbientLight;
    v_Color = vec4(diffuse + ambient, a_Color.a);
  }else if(u_Shader == 1.0 || u_Shader == 2.0){
    v_Color = a_Color;
  }
  
}
`;

var FSHADER_SOURCE = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    uniform float u_Shader;
    varying vec4 v_Color; 
    varying vec3 v_Normal;
    varying vec4 v_Position;
    uniform vec3 u_DiffuseColor;
    uniform vec3 u_LightPosition;
    uniform vec3 u_AmbientLight;
    uniform vec3 u_SpecularColor;
    uniform float u_SpecularExponent;
    uniform mat4 u_MvpMatrix;
    uniform float u_ObjectIndex;
    uniform float u_AlphaMode;
    uniform float u_ClickedIndex;
    float celColor(in float colorVal){
      if(colorVal >= 1.0 ){
        return 1.0;
      }else if (colorVal >= 0.8){
        return 0.8;
      }else if (colorVal >= 0.6){
        return 0.6;
      }else if (colorVal >= 0.4){
        return 0.4;
      }else if(colorVal >= 0.1){
        return 0.1;
      }else if(colorVal >= 0.0 || colorVal < 0.0){
        return 0.0;
      }
      return 0.0;
    }
    void main() {
      if(u_Shader == 0.0){
        //Goraud Shading
        gl_FragColor = v_Color;
      }else if(u_Shader == 1.0){
        //Phong Shading
        vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));
        vec3 lightDirection = normalize(lightPosition - vec3(v_Position));
        float nDotL = max(dot(lightDirection, v_Normal), 0.0);
        vec3 diffuse = u_DiffuseColor * v_Color.rgb * nDotL;
        vec3 ambient = u_AmbientLight;
        vec3 reflectionVector = normalize(2.0 * nDotL * v_Normal - lightDirection);
        vec3 orthoEyeVector = vec3(0.0, 0.0, -1.0);
        //vec3 specular = vec3(v_Color) * u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec3 specular = u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        gl_FragColor = vec4(diffuse + ambient + specular, v_Color.a);
      } else if (u_Shader == 2.0){
        //Cel Shading
        vec3 lightPosition = vec3(u_MvpMatrix * vec4(u_LightPosition, 1));
        vec3 lightDirection = normalize(lightPosition - vec3(v_Position));
        float nDotL = max(dot(lightDirection, v_Normal), 0.0);
        vec3 diffuse = u_DiffuseColor * v_Color.rgb * nDotL;
        vec3 ambient = u_AmbientLight;
        vec3 reflectionVector = normalize(2.0 * nDotL * v_Normal - lightDirection);
        vec3 orthoEyeVector = vec3(0.0, 0.0, -1.0);
        //vec3 specular = vec3(v_Color) * u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec3 specular = u_SpecularColor * pow(max(dot(reflectionVector, orthoEyeVector), 0.0), u_SpecularExponent);
        vec4 resultColor = vec4(diffuse + ambient + specular, 1.0);
        resultColor.r = celColor(resultColor.r);
        resultColor.g = celColor(resultColor.g);
        resultColor.b = celColor(resultColor.b);
        gl_FragColor = resultColor;
      }
      if(u_ClickedIndex == u_ObjectIndex){
        vec3 highlight = vec3(0.15, 0.15, 0.15);
        gl_FragColor = vec4(vec3(gl_FragColor) + highlight, 1.0); 
      } 
      if(u_AlphaMode == 1.0){
        gl_FragColor = vec4(vec3(gl_FragColor), u_ObjectIndex/255.0);
      }
    }
    
`;

var MouseDownLocation;
var ClickedDown = false;
var RightClickedDown = false;
var ClickedIndex;
var Mesh = [];
var ModelMatrix = [];
var Far = 400;
var PastTranslation = [];
var CurrentTranslation = [0, 0];
var CurrentRotation = [0, 0];
var PastTranslation = [];
var CurrentScale = 1;
var ScrollTranslation;

function main(){
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    Mesh.push(new OBJ.Mesh(document.getElementById('objTeapot').innerHTML));
    setClickedIndex(gl, -1); //no clicked index
    setLights(gl);
    setDefaultMvpMatrix(gl, canvas);
    setShader(gl, 1);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    render(gl);
    
    //Event handling
    canvas.onmousedown = function(ev){
        if(ev.button == 0){
            leftClickDown(ev, gl, canvas);
        }else if(ev.button == 2){
            rightClickDown(ev, gl, canvas);
        }
    }
    canvas.onmousemove = function(ev){
        mouseMove(ev, gl, canvas);
    }
    canvas.onmouseup = function(ev){
        if(ev.button == 0){
            leftClickUp(ev, canvas, gl);
        }else if(ev.button == 2){
            rightClickUp(ev, canvas, gl);
        }
    }
    canvas.onwheel = function(ev){
        console.log("Scroll!");
        console.log(ev);
        scroll(ev, canvas, gl);
    }

    

}
function leftClickDown(ev, gl, canvas){
    ClickedDown = true;
    console.log("Left Click Down");
    MouseDownLocation = getCanvasCoordinates(ev, canvas);
    //Select object
    let pixels = getPixels(gl, ev, canvas, false); //Do not need to rerender since we will anyways
    console.log(pixels);
    if(pixels[3] != 255){
        setClickedIndex(gl, pixels[3]);
    }else{
        setClickedIndex(gl, -1); //No object clicked
    }
    render(gl);


}
function leftClickUp(ev, gl,  canvas){
    console.log("Left Click Up!");
    ClickedDown = false;
}
function rightClickDown(ev, gl,  canvas){
    console.log("RightClick down!");
    RightClickedDown = true;
    MouseDownLocation = getCanvasCoordinates(ev, canvas);

}
function rightClickUp(ev, canvas, gl){
    RightClickedDown = false;
}
function scroll(ev, canvas, gl){
    let scaleRatio = 100;
    console.log(ev.deltaY);
    let movement = (ev.deltaY/Math.abs(ev.deltaY))/scaleRatio;
    CurrentScale += movement;
    var mvpMatrix = createDefaultMatrix();
    mvpMatrix.multiply(createTransformMatrix());
    setMvpMatrix(gl, mvpMatrix);
    render(gl);
}
function mouseMove(ev, gl,  canvas){
    if(ClickedDown || RightClickedDown){
        var mvpMatrix = createDefaultMatrix();
        let change = getMouseChange(ev, canvas);
        console.log("Change:");
        console.log(change);
     
        if(ClickedDown){
            CurrentTranslation = change;
            // let translateRatio = 100;
            // let clickTranslation = new Matrix4();
            // clickTranslation.setTranslate(change[0] * translateRatio, change[1] * translateRatio, 0);
            // //mvpMatrix.translate(change[0] * translateRatio, change[1] * translateRatio, 0);
            // mvpMatrix.multiply(clickTranslation);
            
        }
        if(RightClickedDown){
            CurrentRotation = change;
            // let degreeRatio = 360;
            // //Do rotation
            // let changeVector = new Vector3([change[0], change[1], 0]);
            // console.log("Change vector:");
            // console.log(changeVector);
            // let normal = new Vector3([0, 0, 1]); //Z vector to get axis
            // let mag = VectorLibrary.magnitude(changeVector);
            // let axis = VectorLibrary.crossProduct(changeVector.normalize(), normal);
            
            // console.log("Magnitude: " + mag);
            // let rotateMatrix = new Matrix4();
            // rotateMatrix.setRotate(mag * degreeRatio, axis.elements[0], axis.elements[1], axis.elements[2]);
            // mvpMatrix.multiply(rotateMatrix);
        }
        mvpMatrix.multiply(createTransformMatrix());
        setMvpMatrix(gl, mvpMatrix);
        render(gl);
    }
    
}
function createTransformMatrix(){
        var matrix = new Matrix4();
        matrix.multiply(createClickTranslationMatrix());
        matrix.multiply(createClickRotationMatrix());
        matrix.scale(CurrentScale, CurrentScale, CurrentScale);
        return matrix;
}
function createClickTranslationMatrix(){
    let change = CurrentTranslation;
    let translateRatio = 100;
    let clickTranslation = new Matrix4();
    clickTranslation.setTranslate(change[0] * translateRatio, change[1] * translateRatio, 0);
            //mvpMatrix.translate(change[0] * translateRatio, change[1] * translateRatio, 0);
            //mvpMatrix.multiply(clickTranslation);
    return clickTranslation;
}
function createClickRotationMatrix(){
    let change = CurrentRotation;
    let rotateMatrix = new Matrix4();
    if(change[0] == 0 && change[1] == 0){
        return rotateMatrix;
    }
    let degreeRatio = 360;
    //Do rotation
    let changeVector = new Vector3([change[0], change[1], 0]);
    console.log("Change vector:");
    console.log(changeVector);
    let normal = new Vector3([0, 0, 1]); //Z vector to get axis
    let mag = VectorLibrary.magnitude(changeVector);
    let axis = VectorLibrary.crossProduct(changeVector.normalize(), normal);
            
    console.log("Magnitude: " + mag);
    
    rotateMatrix.setRotate(mag * degreeRatio, axis.elements[0], axis.elements[1], axis.elements[2]);
    return rotateMatrix;
}
function render(gl){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for(let i = 0; i < Mesh.length; i++){
        setObjectIndex(gl, i);
        renderMesh(gl, Mesh[i]);
    }
}
function renderMesh(gl, mesh){
    // console.log("Mesh:");
    // console.log(mesh);

    OBJ.initMeshBuffers(gl, mesh);
    var color = new Vector3([1, 0, 0]);
    var colors = makeSolidColorBuffer(color, mesh.vertices.length);
    var vertices = mesh.vertices;
    var normals = mesh.vertexNormals;
    var indices = mesh.indices;
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) 
        return -1;

    // Write the vertex coordinates and color to the buffer object
    if (!initArrayBuffer(gl, new Float32Array(vertices), 3, gl.FLOAT, 'a_Position'))
        return -1;

    if (!initArrayBuffer(gl, new Float32Array(colors), 3, gl.FLOAT, 'a_Color'))
        return -1;
    
    
    if (!initArrayBuffer(gl, new Float32Array(normals), 3, gl.FLOAT, 'a_Normal'))
        return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}
function getPixels(gl, ev, canvas, rerender=true){
    let pixels = new Uint8Array(4);
    let intCoords = getCanvasCoordinatesInt(ev, canvas);
    setAlphaMode(gl, 1.0);

    render(gl);
    gl.readPixels(intCoords[0], intCoords[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    console.log('RGB clicked: (' + pixels[0] + ', ' + pixels[1] + ', ' + pixels[2] + ')');
    setAlphaMode(gl, 0.0);
    if(rerender){
        render(gl);
    }
    return pixels;
}

function initArrayBuffer(gl, data, num, type, attribute) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
      console.log('Failed to get the storage location of ' + attribute);
      return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);
  
    return true;
}
function getMouseChange(ev, canvas){
    var current = getCanvasCoordinates(ev, canvas);
    return [current[0] - MouseDownLocation[0], current[1] - MouseDownLocation[1]];
}
function getCanvasCoordinatesInt(ev, canvas){
    let x = ev.clientX;
    let y = ev.clientY;
    let rect = ev.target.getBoundingClientRect();
    x = (x - rect.left);
    y = (rect.bottom - y);
    return [x, y];
  }
  function getCanvasCoordinates(ev, canvas){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect() ;
  
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
    return [x, y];
  }

function makeSolidColorBuffer(color, length){
    let colorArr = color.elements;
    var colorBuff = [];
    for(let i = 0; i < length; i++){
      colorBuff.push(colorArr[0]);colorBuff.push(colorArr[1]);colorBuff.push(colorArr[2]);
    }
    return colorBuff;
  }
  function setLights(gl){
    var u_DiffuseColor = gl.getUniformLocation(gl.program, 'u_DiffuseColor');
    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

     // Set the light color (white)
    gl.uniform3f(u_DiffuseColor, 1.0, 1.0, 1.0);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, 0.0, 80.0, -150.0);
    // Set the ambient light
    gl.uniform3f(u_AmbientLight, 0.5, 0.0, 0.0);

    //Set specular exponent
    setSpecularColor(gl, 0.8, 0.8, 0.8);
    setSpecularExponent(gl, 20.0);
  }
  function setDiffuse(gl, r, g, b){
    var u_DiffuseColor = gl.getUniformLocation(gl.program, 'u_DiffuseColor');
    gl.uniform3f(u_DiffuseColor, r, g, b);

}
  function setLightPosition(gl, position){
    var el = position.elements;
    var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    gl.uniform3f(u_LightPosition, el[0], el[1], el[2]);
  }
  function setAmbient(gl, r, g, b){
    var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    gl.uniform3f(u_AmbientLight, r, g, b);
  }
  function setShader(gl, shader){
    var u_Shader = gl.getUniformLocation(gl.program, 'u_Shader');
    gl.uniform1f(u_Shader, shader);
  }
  function setSpecularColor(gl, r, g, b){
    var u_SpecularColor = gl.getUniformLocation(gl.program, 'u_SpecularColor');
    gl.uniform3f(u_SpecularColor, r, g, b);
  }
  function setSpecularExponent(gl, exponent){
    var u_SpecularExponent = gl.getUniformLocation(gl.program, 'u_SpecularExponent');
    gl.uniform1f(u_SpecularExponent, exponent);
  }
  function setEyeVector(gl, eyePosition){
    var u_EyeVector = gl.getUniformLocation(gl.program, 'u_EyeVector');
    gl.uniform3f(u_EyeVector, eyePosition);
  }
  function setDefaultMvpMatrix(gl, canvas){
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
      console.log('Failed to get the storage location of u_MvpMatrix');
      return;
    }
    //Set the eye point and the viewing volume
    
    //mvpMatrix.translate(100, 0, 0);
    // var mvpMatrix = new Matrix4();

    // mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 600);
    // mvpMatrix.lookAt(0, 50, Far, 0, 0, 0, 0, 1, 0);
    var mvpMatrix = createDefaultMatrix();

  
    // Pass the model view projection matrix to u_MvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  }
  //Makes default view matrix
  function createDefaultMatrix(){
    var eye = new Vector3([0, 50, Far]);
    var center = new Vector3([0, 0, 0]);
    var up = new Vector3([0, 1, 0]);
    var near = 1;
    var far = Far + 200;
    var viewAngle = 30;

    var mvpMatrix = createVpMatrix(eye, center, up, near, far, viewAngle);
    return mvpMatrix;
  }
  function createVpMatrix(eyePosition, center, up, near, far, viewAngle, ratio=1){
    var mvpMatrix = new Matrix4();
    //var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    mvpMatrix.setPerspective(viewAngle, ratio, near, far);
    var eye = eyePosition.elements;
    var point = center.elements;
    var upVec = up.elements;
    mvpMatrix.lookAt(eye[0], eye[1], eye[2], point[0], point[1], point[2], upVec[0], upVec[1], upVec[2]);
    // Pass the model view projection matrix to u_MvpMatrix
    //gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    return mvpMatrix;
  }
  function setMvpMatrix(gl, matrix){
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    gl.uniformMatrix4fv(u_MvpMatrix, false, matrix.elements);
  }

  function setObjectIndex(gl, index){
    //Get uniform location
    var u_ObjectIndex = gl.getUniformLocation(gl.program, 'u_ObjectIndex');
    //Set uniform value to index
    gl.uniform1f(u_ObjectIndex, index);
  }
  function setAlphaMode(gl, alpha){
    // console.log('Changing alpha mode to ' + alpha);
    //Get uniform location
    var u_AlphaMode = gl.getUniformLocation(gl.program, 'u_AlphaMode');
    //Set uniform calue
    gl.uniform1f(u_AlphaMode, alpha);
  }
  function setClickedIndex(gl, index){
    ClickedIndex = index;
    var u_ClickedIndex = gl.getUniformLocation(gl.program, 'u_ClickedIndex');
    gl.uniform1f(u_ClickedIndex, index);
  }