export function handleError(error: unknown){
 console.error(error);
 return {
   success:false,
   message:"Something went wrong. Please try again."
 };
}