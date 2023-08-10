<?php
$host = '0.0.0.0';
$user = 'root';
$password = 'root';
$conn = mysqli_connect( $host,$user,$password );
mysqli_select_db($conn, 'norqom');
$name = $_POST['name'];
$email = $_POST['email'];
$telephone = $_POST['telephone'];
$query = "insert into norqom values" 
  ('$name','$email','$telephone')";
$data = mysqli_query($conn,$query);
if($data) 
{ 
    echo "Data Inserted "; 
} 
else 
{ 
    echo "Error "; 
}

?>  
